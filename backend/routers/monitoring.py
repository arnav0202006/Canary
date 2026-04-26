import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..database import get_db
from ..services.production_monitor import production_monitor

router = APIRouter(prefix="/agents", tags=["monitoring"])


@router.post("/{agent_id}/monitor")
def monitor_production_request(
    agent_id: str,
    user_input: str,
    agent_output: str,
    context: Dict[str, Any] = None,
    db: Session = Depends(get_db)
):
    """
    Monitors a production agent request for violations and safety issues.
    Automatically triggers rollback if critical violations are detected.
    """
    try:
        result = production_monitor.monitor_production_request(
            db=db,
            agent_id=agent_id,
            user_input=user_input,
            agent_output=agent_output,
            context=context
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Monitoring failed: {str(e)}")


@router.post("/{agent_id}/monitor/start")
def start_monitoring(agent_id: str, db: Session = Depends(get_db)):
    """Start monitoring for an agent"""
    # For now, just return success - monitoring is always active
    return {"status": "monitoring_started", "agent_id": agent_id}


@router.get("/{agent_id}/monitor/status")
def get_monitor_status(agent_id: str, db: Session = Depends(get_db)):
    """Get monitoring status for an agent"""
    return {"agent_id": agent_id, "status": "active", "monitoring_enabled": True}


@router.get("/{agent_id}/monitor/violations")
def get_monitor_violations(agent_id: str, hours: int = 24, db: Session = Depends(get_db)):
    """Get recent violations for an agent"""
    from ..models import AuditLog
    from datetime import datetime, timedelta
    
    since_time = datetime.utcnow() - timedelta(hours=hours)
    violations = db.query(AuditLog).filter(
        AuditLog.agent_id == agent_id,
        AuditLog.action == "critical_violation_detected",
        AuditLog.created_at >= since_time
    ).order_by(AuditLog.created_at.desc()).all()
    
    return {
        "agent_id": agent_id,
        "violations": [
            {
                "id": v.id,
                "timestamp": v.created_at.isoformat(),
                "details": v.details
            } for v in violations
        ],
        "count": len(violations),
        "time_range_hours": hours
    }


@router.get("/{agent_id}/monitor/metrics")
def get_monitor_metrics(agent_id: str, hours: int = 24, db: Session = Depends(get_db)):
    """Get monitoring metrics for an agent"""
    try:
        stats = production_monitor.get_monitoring_stats(db, agent_id, hours)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.get("/{agent_id}/health")
def get_health_history(agent_id: str, limit: int = 20, db: Session = Depends(get_db)):
    """Get recent health check results from the background monitor"""
    from ..models import AuditLog
    events = db.query(AuditLog).filter(
        AuditLog.agent_id == agent_id,
        AuditLog.action.in_(["monitor_check", "monitor_rollback"]),
    ).order_by(AuditLog.created_at.desc()).limit(limit).all()

    return [
        {
            "id": e.id,
            "action": e.action,
            "timestamp": e.created_at.isoformat(),
            "details": json.loads(e.details) if e.details else {},
        }
        for e in events
    ]


@router.post("/{agent_id}/validate-output")
def validate_agent_output(
    agent_id: str,
    user_input: str,
    agent_output: str,
    context: Dict[str, Any] = None
):
    """
    Validates agent output against business rules without triggering actions.
    Useful for pre-deployment testing or manual validation.
    """
    try:
        result = production_monitor.validate_agent_output(
            agent_id=agent_id,
            user_input=user_input,
            agent_output=agent_output,
            context=context
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")