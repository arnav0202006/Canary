from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuditLog, Agent, Version
from ..schemas import AuditLogResponse

router = APIRouter(prefix="/agents", tags=["audit"])


@router.get("/{agent_id}/audit/logs", response_model=list[AuditLogResponse])
def get_audit_logs(agent_id: str, since: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    """Get audit logs for an agent."""
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

    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()


@router.get("/audit/search")
def search_audit(query: str, agent_id: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    """Search audit logs by query string"""
    audit_query = db.query(AuditLog)
    
    if agent_id:
        audit_query = audit_query.filter(AuditLog.agent_id == agent_id)
    
    # Simple text search in action and details
    audit_query = audit_query.filter(
        (AuditLog.action.contains(query)) | 
        (AuditLog.details.contains(query))
    )
    
    results = audit_query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    
    return {
        "query": query,
        "results": [
            {
                "id": log.id,
                "agent_id": log.agent_id,
                "version_id": log.version_id,
                "action": log.action,
                "actor": log.actor,
                "details": log.details,
                "created_at": log.created_at.isoformat()
            } for log in results
        ],
        "count": len(results)
    }
