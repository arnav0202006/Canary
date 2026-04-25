from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

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


@router.get("/{agent_id}/deployments")
def list_deployments(agent_id: str, db: Session = Depends(get_db)):
    deployments = db.query(Deployment).filter(Deployment.agent_id == agent_id).order_by(Deployment.started_at.desc()).all()
    return [
        {
            "id": d.id,
            "version_id": d.version_id,
            "status": d.status,
            "traffic_percentage": d.traffic_percentage,
            "eval_threshold": d.eval_threshold,
            "started_at": d.started_at,
            "completed_at": d.completed_at,
        }
        for d in deployments
    ]
