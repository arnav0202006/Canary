from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import Deployment
from ..schemas import DeployRequest, DeployResponse, RollbackResponse
from ..services import deploy_service

router = APIRouter(prefix="/agents", tags=["deployments"])


@router.post("/{agent_id}/deploy", response_model=DeployResponse)
def deploy(agent_id: str, payload: DeployRequest, db: Session = Depends(get_db)):
    result = deploy_service.deploy(
        db=db,
        agent_id=agent_id,
        version_id=payload.version_id,
        traffic_percentage=payload.traffic_percentage,
        eval_threshold=payload.eval_threshold,
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
