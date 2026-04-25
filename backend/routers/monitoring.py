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


@router.get("/{agent_id}/monitoring/stats")
def get_monitoring_stats(agent_id: str, hours: int = 24, db: Session = Depends(get_db)):
    """Gets monitoring statistics for an agent over the specified time period"""
    try:
        stats = production_monitor.get_monitoring_stats(db, agent_id, hours)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


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