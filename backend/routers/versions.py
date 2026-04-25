import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Agent, Version, AuditLog
from ..schemas import VersionCreate, VersionResponse, DiffRequest, DiffResponse, EvalResponse, EvalResultItem
from ..services.eval_service import run_eval, diff_versions

router = APIRouter(prefix="/agents", tags=["versions"])


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


@router.get("/{agent_id}/versions/{version_id}", response_model=VersionResponse)
def get_version(agent_id: str, version_id: str, db: Session = Depends(get_db)):
    version = db.query(Version).filter(Version.id == version_id, Version.agent_id == agent_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


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


@router.post("/diff", response_model=DiffResponse, tags=["diff"])
def diff(payload: DiffRequest, db: Session = Depends(get_db)):
    v_a = db.query(Version).filter(Version.id == payload.version_id_a).first()
    v_b = db.query(Version).filter(Version.id == payload.version_id_b).first()

    if not v_a:
        raise HTTPException(status_code=404, detail=f"Version {payload.version_id_a} not found")
    if not v_b:
        raise HTTPException(status_code=404, detail=f"Version {payload.version_id_b} not found")

    behavioral_diff = diff_versions(v_a.prompt, v_b.prompt, payload.version_id_a, payload.version_id_b)

    return DiffResponse(
        version_id_a=payload.version_id_a,
        version_id_b=payload.version_id_b,
        behavioral_diff=behavioral_diff,
        eval_score_a=v_a.eval_score,
        eval_score_b=v_b.eval_score,
    )
