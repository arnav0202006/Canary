import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Agent, Version, AuditLog
from ..schemas import VersionCreate, VersionResponse, DiffRequest, DiffResponse, EvalResponse, EvalResultItem
from ..services.eval_service import run_eval, diff_versions

router = APIRouter(prefix="/agents", tags=["versions"])

# Add a separate router for direct version access
versions_direct_router = APIRouter(prefix="/versions", tags=["versions-direct"])


@router.post("/{agent_id}/versions", response_model=VersionResponse)
def create_version(agent_id: str, payload: VersionCreate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    version_count = db.query(Version).filter(Version.agent_id == agent_id).count()
    version = Version(
        agent_id=agent_id,
        version_number=version_count + 1,
        prompt=payload.prompt,
        tools_config=json.dumps(payload.tools_config),
        metadata_=json.dumps(payload.metadata),
        state=json.dumps(payload.state),
        context=json.dumps(payload.context),
        parent_version_id=payload.parent_version_id,
        created_by=payload.created_by,
    )
    db.add(version)

    log = AuditLog(
        agent_id=agent_id,
        version_id=version.id,
        action="version_created",
        actor=payload.created_by,
        details=json.dumps({"version_number": version.version_number}),
    )
    db.add(log)
    db.commit()
    db.refresh(version)
    return version


@router.get("/{agent_id}/versions", response_model=list[VersionResponse])
def list_versions(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return db.query(Version).filter(Version.agent_id == agent_id).order_by(Version.version_number).all()


@router.patch("/{agent_id}/versions/{version_id}", response_model=VersionResponse)
def update_version(agent_id: str, version_id: str, payload: VersionCreate, db: Session = Depends(get_db)):
    version = db.query(Version).filter(Version.id == version_id, Version.agent_id == agent_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    version.prompt = payload.prompt
    version.tools_config = json.dumps(payload.tools_config)
    version.metadata_ = json.dumps(payload.metadata)
    version.state = json.dumps(payload.state)
    version.context = json.dumps(payload.context)
    db.commit()
    db.refresh(version)
    return version


@router.delete("/{agent_id}/versions/{version_id}")
def delete_version(agent_id: str, version_id: str, db: Session = Depends(get_db)):
    version = db.query(Version).filter(Version.id == version_id, Version.agent_id == agent_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    db.delete(version)
    db.commit()
    return {"message": "Version deleted successfully"}


@router.post("/{agent_id}/versions/{version_id}/eval", response_model=EvalResponse)
def eval_version(agent_id: str, version_id: str, threshold: float = 0.90, db: Session = Depends(get_db)):
    version = db.query(Version).filter(Version.id == version_id, Version.agent_id == agent_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    result = run_eval(version_id, version.prompt, threshold)
    version.eval_score = result["overall_score"]
    db.commit()

    return EvalResponse(
        version_id=version_id,
        overall_score=result["overall_score"],
        results=[EvalResultItem(**r) for r in result["results"]],
        passed=result["passed"],
        threshold=threshold,
    )


@router.get("/{agent_id}/evals")
def list_evaluations(agent_id: str, db: Session = Depends(get_db)):
    """List all evaluations for an agent"""
    from ..models import EvalResult
    
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get all versions for this agent
    versions = db.query(Version).filter(Version.agent_id == agent_id).all()
    version_ids = [v.id for v in versions]
    
    # Get evaluations for all versions
    evals = db.query(EvalResult).filter(EvalResult.version_id.in_(version_ids)).order_by(EvalResult.created_at.desc()).all()
    
    return {
        "agent_id": agent_id,
        "evaluations": [
            {
                "id": e.id,
                "version_id": e.version_id,
                "score": e.score,
                "results": e.results,
                "created_at": e.created_at.isoformat()
            } for e in evals
        ],
        "count": len(evals)
    }


# Direct version endpoints (not nested under agents)
@versions_direct_router.get("/{version_id}", response_model=VersionResponse)
def get_version_direct(version_id: str, db: Session = Depends(get_db)):
    version = db.query(Version).filter(Version.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@versions_direct_router.post("/{version_id}/evals")
def run_version_eval(version_id: str, threshold: float = 0.90, db: Session = Depends(get_db)):
    """Run evaluation for a specific version"""
    version = db.query(Version).filter(Version.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    result = run_eval(version_id, version.prompt, threshold)
    version.eval_score = result["overall_score"]
    db.commit()

    return {
        "version_id": version_id,
        "overall_score": result["overall_score"],
        "results": result["results"],
        "passed": result["passed"],
        "threshold": threshold,
    }


@versions_direct_router.get("/{version_id}/evals/results")
def get_version_eval_results(version_id: str, db: Session = Depends(get_db)):
    """Get evaluation results for a specific version"""
    from ..models import EvalResult
    
    version = db.query(Version).filter(Version.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    evals = db.query(EvalResult).filter(EvalResult.version_id == version_id).order_by(EvalResult.created_at.desc()).all()
    
    return {
        "version_id": version_id,
        "evaluations": [
            {
                "id": e.id,
                "score": e.score,
                "results": e.results,
                "created_at": e.created_at.isoformat()
            } for e in evals
        ],
        "latest_score": evals[0].score if evals else None
    }
