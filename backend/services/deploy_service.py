import json
from datetime import datetime
from sqlalchemy.orm import Session

from ..models import Agent, Version, Deployment, AuditLog
from .eval_service import run_eval


def _log(db: Session, agent_id: str, action: str, version_id: str = None, details: dict = None, actor: str = "system"):
    entry = AuditLog(
        agent_id=agent_id,
        version_id=version_id,
        action=action,
        actor=actor,
        details=json.dumps(details or {}),
    )
    db.add(entry)
    db.commit()


def deploy(db: Session, agent_id: str, version_id: str, traffic_percentage: int, eval_threshold: float, actor: str = "system") -> dict:
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    version = db.query(Version).filter(Version.id == version_id).first()

    if not agent:
        return {"status": "error", "message": f"Agent {agent_id} not found"}
    if not version:
        return {"status": "error", "message": f"Version {version_id} not found"}

    deployment = Deployment(
        agent_id=agent_id,
        version_id=version_id,
        status="pending",
        traffic_percentage=traffic_percentage,
        eval_threshold=eval_threshold,
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    _log(db, agent_id, "deploy_started", version_id, {"deployment_id": deployment.id, "threshold": eval_threshold}, actor)

    # Gate 1: behavioral eval
    eval_result = run_eval(version_id, version.prompt, eval_threshold)
    version.eval_score = eval_result["overall_score"]
    version.status = "tested"
    db.commit()

    if not eval_result["passed"]:
        version.status = "rejected"
        deployment.status = "failed"
        deployment.completed_at = datetime.utcnow()
        db.commit()
        _log(db, agent_id, "gate1_failed", version_id, {"score": eval_result["overall_score"], "threshold": eval_threshold}, actor)
        return {
            "deployment_id": deployment.id,
            "agent_id": agent_id,
            "version_id": version_id,
            "status": "rejected",
            "eval_score": eval_result["overall_score"],
            "message": f"Gate 1 failed — eval score {eval_result['overall_score']:.0%} is below threshold {eval_threshold:.0%}. Staying on last known good.",
        }

    _log(db, agent_id, "gate1_passed", version_id, {"score": eval_result["overall_score"]}, actor)

    # Gate 2: canary
    version.status = "canary"
    deployment.status = "canary"
    agent.current_version_id = version_id
    db.commit()
    _log(db, agent_id, "canary_started", version_id, {"traffic_percentage": traffic_percentage}, actor)

    # Simulate canary health check with a second eval pass
    canary_eval = run_eval(version_id, version.prompt, eval_threshold)

    if not canary_eval["passed"]:
        _rollback_to_lkg(db, agent, version, deployment, canary_eval["overall_score"], eval_threshold, actor)
        return {
            "deployment_id": deployment.id,
            "agent_id": agent_id,
            "version_id": version_id,
            "status": "rolled_back",
            "eval_score": canary_eval["overall_score"],
            "message": f"Canary failed — live score {canary_eval['overall_score']:.0%} dropped below {eval_threshold:.0%}. Auto-rolled back to {agent.last_known_good_id}.",
        }

    # Promote to production
    version.status = "production"
    deployment.status = "production"
    deployment.completed_at = datetime.utcnow()
    agent.last_known_good_id = version_id
    db.commit()
    _log(db, agent_id, "promoted_to_production", version_id, {"score": canary_eval["overall_score"]}, actor)

    return {
        "deployment_id": deployment.id,
        "agent_id": agent_id,
        "version_id": version_id,
        "status": "production",
        "eval_score": canary_eval["overall_score"],
        "message": f"Version {version.version_number} is live in production. Eval score: {canary_eval['overall_score']:.0%}. LKG advanced.",
    }


def rollback(db: Session, agent_id: str, actor: str = "system") -> dict:
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        return {"status": "error", "message": f"Agent {agent_id} not found"}
    if not agent.last_known_good_id:
        return {"status": "error", "message": "No last known good version available for rollback"}

    lkg_version = db.query(Version).filter(Version.id == agent.last_known_good_id).first()
    current_version_id = agent.current_version_id

    if current_version_id:
        current = db.query(Version).filter(Version.id == current_version_id).first()
        if current:
            current.status = "rolled_back"

    agent.current_version_id = agent.last_known_good_id
    db.commit()
    _log(db, agent_id, "manual_rollback", agent.last_known_good_id, {"from_version": current_version_id}, actor)

    return {
        "agent_id": agent_id,
        "rolled_back_to_version_id": agent.last_known_good_id,
        "message": f"Rolled back to version {lkg_version.version_number} (last known good).",
    }


def _rollback_to_lkg(db: Session, agent: Agent, failed_version: Version, deployment: Deployment, score: float, threshold: float, actor: str):
    failed_version.status = "rolled_back"
    deployment.status = "rolled_back"
    deployment.completed_at = datetime.utcnow()

    if agent.last_known_good_id:
        agent.current_version_id = agent.last_known_good_id

    db.commit()
    _log(db, agent.id, "canary_rollback", failed_version.id, {
        "score": score,
        "threshold": threshold,
        "restored_to": agent.last_known_good_id,
    }, actor)
