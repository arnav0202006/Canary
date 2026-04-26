import asyncio
import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta

from ..database import SessionLocal
from ..models import Agent, Version, AuditLog
from .eval_service import run_eval, judge_production_interaction
from . import deploy_service

MONITOR_INTERVAL = int(os.getenv("MONITOR_INTERVAL_SECONDS", "60"))
logger = logging.getLogger("canary.monitor")

_executor = ThreadPoolExecutor(max_workers=2)


async def monitor_loop():
    logger.info("Health monitor started — checking every %ds", MONITOR_INTERVAL)
    while True:
        await asyncio.sleep(MONITOR_INTERVAL)
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(_executor, _check_all_agents)
        except Exception as e:
            logger.error("Monitor cycle error: %s", e)


def _check_all_agents():
    db = SessionLocal()
    try:
        agents = db.query(Agent).filter(Agent.current_version_id.isnot(None)).all()
        for agent in agents:
            try:
                _check_agent(db, agent)
            except Exception as e:
                logger.error("Failed to check agent '%s': %s", agent.name, e)
    finally:
        db.close()


def _check_agent(db, agent: Agent):
    version = db.query(Version).filter(
        Version.id == agent.current_version_id,
        Version.status == "production",
    ).first()
    if not version:
        return

    # Use the agent's monitor_threshold (strict runtime gate), not the lenient deploy threshold
    threshold = getattr(agent, "monitor_threshold", None) or 0.70

    logger.info(
        "Checking '%s' v%d (threshold %.0f%%)",
        agent.name, version.version_number, threshold * 100,
    )

    # Prefer real production traffic over synthetic test cases
    real_score = _score_from_real_traffic(db, agent.id, version.id)
    if real_score is not None:
        score = real_score
        passed = score >= threshold
        source = "real_traffic"
    else:
        result = run_eval(version.id, version.prompt, threshold)
        score = result["overall_score"]
        passed = result["passed"]
        source = "synthetic"

    _log(db, agent.id, version.id, "monitor_check", {
        "score": score,
        "threshold": threshold,
        "passed": passed,
        "version_number": version.version_number,
        "source": source,
    })

    if not passed:
        logger.warning(
            "Agent '%s' v%d FAILED health check: %.0f%% < %.0f%%",
            agent.name, version.version_number, score * 100, threshold * 100,
        )
        if agent.last_known_good_id and agent.last_known_good_id != version.id:
            deploy_service.rollback(db=db, agent_id=agent.id, actor="monitor")
            _log(db, agent.id, version.id, "monitor_rollback", {
                "score": score,
                "threshold": threshold,
                "rolled_back_to": agent.last_known_good_id,
                "version_number": version.version_number,
            })
            logger.info(
                "Auto-rolled back '%s' from v%d to LKG",
                agent.name, version.version_number,
            )
        else:
            logger.warning(
                "Agent '%s' has no LKG to roll back to — manual intervention needed",
                agent.name,
            )
    else:
        logger.info(
            "Agent '%s' v%d health OK: %.0f%%",
            agent.name, version.version_number, score * 100,
        )


MIN_REAL_INTERACTIONS = 3  # minimum before switching away from synthetic


def _score_from_real_traffic(db, agent_id: str, version_id: str):
    """Return average LLM-judge score over recent real interactions, or None if not enough traffic."""
    since = datetime.utcnow() - timedelta(hours=1)
    interactions = db.query(AuditLog).filter(
        AuditLog.agent_id == agent_id,
        AuditLog.version_id == version_id,
        AuditLog.action == "production_interaction",
        AuditLog.created_at >= since,
    ).order_by(AuditLog.created_at.desc()).limit(20).all()

    if len(interactions) < MIN_REAL_INTERACTIONS:
        return None

    samples = []
    for entry in interactions:
        try:
            details = json.loads(entry.details)
            samples.append((details["user_input"], details["agent_output"]))
        except (json.JSONDecodeError, KeyError):
            continue

    if len(samples) < MIN_REAL_INTERACTIONS:
        return None

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(judge_production_interaction, ui, ao) for ui, ao in samples]
        scores = [f.result() for f in as_completed(futures)]

    return round(sum(scores) / len(scores), 4)


def _log(db, agent_id: str, version_id: str, action: str, details: dict):
    entry = AuditLog(
        agent_id=agent_id,
        version_id=version_id,
        action=action,
        actor="monitor",
        details=json.dumps(details),
    )
    db.add(entry)
    db.commit()
