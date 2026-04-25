import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Version, ApiUsage
from ..schemas import ApiUsageCreate, ApiUsageResponse

router = APIRouter(prefix="/agents/{agent_id}/versions/{version_id}/api-usages", tags=["api-usages"])


@router.post("", response_model=ApiUsageResponse)
def create_api_usage(agent_id: str, version_id: str, payload: ApiUsageCreate, db: Session = Depends(get_db)):
    version = db.query(Version).filter(Version.id == version_id, Version.agent_id == agent_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    api_usage = ApiUsage(
        version_id=version_id,
        api_name=payload.api_name,
        endpoint=payload.endpoint,
        method=payload.method,
        request_payload=json.dumps(payload.request_payload),
        response_payload=json.dumps(payload.response_payload),
        status_code=payload.status_code,
        duration_ms=payload.duration_ms,
    )
    db.add(api_usage)
    db.commit()
    db.refresh(api_usage)
    return api_usage


@router.get("", response_model=list[ApiUsageResponse])
def list_api_usages(agent_id: str, version_id: str, db: Session = Depends(get_db)):
    version = db.query(Version).filter(Version.id == version_id, Version.agent_id == agent_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    return db.query(ApiUsage).filter(ApiUsage.version_id == version_id).order_by(ApiUsage.timestamp).all()