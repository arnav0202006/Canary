import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import Deployment, AuditLog, Version
from ..schemas import DeployRequest, DeployResponse, RollbackResponse
from ..services import deploy_service

router = APIRouter(prefix="/agents", tags=["deployments"])


def _derive_steps(db: Session, agent_id: str, version_id: str, started_at: datetime) -> list:
    events = db.query(AuditLog).filter(
        AuditLog.agent_id == agent_id,
        AuditLog.version_id == version_id,
        AuditLog.created_at >= started_at,
    ).order_by(AuditLog.created_at).all()

    actions = {e.action for e in events}

    def get_details(action: str) -> dict:
        e = next((e for e in events if e.action == action), None)
        if not e:
            return {}
        try:
            return json.loads(e.details)
        except Exception:
            return {}

    steps = [{"id": "validate", "name": "Validate", "status": "success"}]

    # Gate 1
    if "gate1_passed" in actions:
        score = get_details("gate1_passed").get("score")
        steps.append({"id": "eval", "name": "Behavioral Eval", "status": "success", "score": score})
    elif "gate1_failed" in actions:
        score = get_details("gate1_failed").get("score")
        steps.append({"id": "eval", "name": "Behavioral Eval", "status": "failed", "score": score})
        steps.append({"id": "canary", "name": "Canary Deploy", "status": "skipped"})
        steps.append({"id": "health", "name": "Health Check", "status": "skipped"})
        steps.append({"id": "promote", "name": "Promote to Production", "status": "skipped"})
        return steps
    else:
        steps.append({"id": "eval", "name": "Behavioral Eval", "status": "in-progress"})
        steps.append({"id": "canary", "name": "Canary Deploy", "status": "pending"})
        steps.append({"id": "health", "name": "Health Check", "status": "pending"})
        steps.append({"id": "promote", "name": "Promote to Production", "status": "pending"})
        return steps

    # Canary deploy
    if "canary_started" in actions:
        steps.append({"id": "canary", "name": "Canary Deploy", "status": "success"})
    else:
        steps.append({"id": "canary", "name": "Canary Deploy", "status": "pending"})
        steps.append({"id": "health", "name": "Health Check", "status": "pending"})
        steps.append({"id": "promote", "name": "Promote to Production", "status": "pending"})
        return steps

    # Health check
    if "promoted_to_production" in actions:
        steps.append({"id": "health", "name": "Health Check", "status": "success"})
    elif "canary_rollback" in actions:
        steps.append({"id": "health", "name": "Health Check", "status": "failed"})
        steps.append({"id": "promote", "name": "Promote to Production", "status": "skipped"})
        return steps
    else:
        steps.append({"id": "health", "name": "Health Check", "status": "in-progress"})
        steps.append({"id": "promote", "name": "Promote to Production", "status": "pending"})
        return steps

    # Promote
    steps.append({"id": "promote", "name": "Promote to Production", "status": "success"})
    return steps


@router.get("/{agent_id}/deployments")
def list_deployments(agent_id: str, db: Session = Depends(get_db)):
    deployments = db.query(Deployment).filter(
        Deployment.agent_id == agent_id
    ).order_by(Deployment.started_at.desc()).all()

    result = []
    for d in deployments:
        version = db.query(Version).filter(Version.id == d.version_id).first()
        steps = _derive_steps(db, agent_id, d.version_id, d.started_at)
        result.append({
            "id": d.id,
            "agent_id": agent_id,
            "version_id": d.version_id,
            "version_number": version.version_number if version else None,
            "eval_score": version.eval_score if version else None,
            "status": d.status,
            "traffic_percentage": d.traffic_percentage,
            "eval_threshold": d.eval_threshold,
            "started_at": d.started_at.isoformat() if d.started_at else None,
            "completed_at": d.completed_at.isoformat() if d.completed_at else None,
            "steps": steps,
        })
    return result


@router.post("/{agent_id}/deploy", response_model=DeployResponse)
def deploy(agent_id: str, payload: DeployRequest, db: Session = Depends(get_db)):
    result = deploy_service.deploy(
        db=db,
        agent_id=agent_id,
        version_id=payload.version_id,
        traffic_percentage=payload.traffic_percentage,
        eval_threshold=payload.eval_threshold,
        monitor_threshold=payload.monitor_threshold,
    )
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.post("/{agent_id}/rollback", response_model=RollbackResponse)
def rollback(agent_id: str, db: Session = Depends(get_db)):
    result = deploy_service.rollback(db=db, agent_id=agent_id)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.get("/{agent_id}/deployments/{deployment_id}")
def get_deployment(agent_id: str, deployment_id: str, db: Session = Depends(get_db)):
    deployment = db.query(Deployment).filter(
        Deployment.id == deployment_id, 
        Deployment.agent_id == agent_id
    ).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    return {
        "id": deployment.id,
        "version_id": deployment.version_id,
        "status": deployment.status,
        "traffic_percentage": deployment.traffic_percentage,
        "eval_threshold": deployment.eval_threshold,
        "started_at": deployment.started_at,
        "completed_at": deployment.completed_at,
    }


@router.post("/deployments/canary", response_model=DeployResponse)
def deploy_canary(payload: DeployRequest, db: Session = Depends(get_db)):
    """Deploy a version to canary environment"""
    # For now, just use the agent_id from the payload or assume it's included
    # This is a simplified version - in practice you'd need agent_id in the request
    raise HTTPException(status_code=501, detail="Canary deployment not implemented yet")


@router.post("/deployments/{deployment_id}/promote")
def promote_deployment(deployment_id: str, db: Session = Depends(get_db)):
    """Promote a canary deployment to production"""
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    if deployment.status != "canary":
        raise HTTPException(status_code=400, detail="Only canary deployments can be promoted")
    
    # Mark as promoted
    deployment.status = "promoted"
    deployment.completed_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Deployment promoted to production", "deployment_id": deployment_id}
