from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuditLog, Agent, Version
from ..schemas import AuditLogResponse

router = APIRouter(prefix="/agents", tags=["audit"])


@router.get("/{agent_id}/audit", response_model=list[AuditLogResponse])
def get_audit_log(agent_id: str, since: Optional[str] = None, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    query = db.query(AuditLog).filter(AuditLog.agent_id == agent_id)
    if since:
        try:
            since_dt = datetime.fromisoformat(since)
            query = query.filter(AuditLog.created_at >= since_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format for 'since'. Use ISO 8601.")

    return query.order_by(AuditLog.created_at.desc()).all()


@router.get("/{agent_id}/audit/at")
def get_version_at_time(agent_id: str, timestamp: str, db: Session = Depends(get_db)):
    """Return the exact version that was active at a given timestamp."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    try:
        target_dt = datetime.fromisoformat(timestamp)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO 8601.")

    # Find the most recent deploy or promote event at or before the target time
    log = (
        db.query(AuditLog)
        .filter(
            AuditLog.agent_id == agent_id,
            AuditLog.action.in_(["promoted_to_production", "canary_started", "manual_rollback", "canary_rollback"]),
            AuditLog.created_at <= target_dt,
        )
        .order_by(AuditLog.created_at.desc())
        .first()
    )

    if not log or not log.version_id:
        return {"agent_id": agent_id, "timestamp": timestamp, "active_version": None, "message": "No deployment found before this timestamp."}

    version = db.query(Version).filter(Version.id == log.version_id).first()
    return {
        "agent_id": agent_id,
        "timestamp": timestamp,
        "active_version_id": log.version_id,
        "version_number": version.version_number if version else None,
        "version_status": version.status if version else None,
        "event": log.action,
        "event_time": log.created_at.isoformat(),
    }
