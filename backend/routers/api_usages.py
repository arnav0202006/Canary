import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from ..database import get_db
from ..models import Version, ApiUsage, Agent
from ..schemas import ApiUsageCreate, ApiUsageResponse

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/agents/{agent_id}")
def get_agent_usage(agent_id: str, period: str = "24h", db: Session = Depends(get_db)):
    """Get API usage statistics for an agent"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Parse period
    if period.endswith("h"):
        hours = int(period[:-1])
        since_time = datetime.utcnow() - timedelta(hours=hours)
    else:
        raise HTTPException(status_code=400, detail="Invalid period format. Use '24h', '7d', etc.")
    
    # Get all versions for this agent
    versions = db.query(Version).filter(Version.agent_id == agent_id).all()
    version_ids = [v.id for v in versions]
    
    # Get usage for all versions
    usages = db.query(ApiUsage).filter(
        ApiUsage.version_id.in_(version_ids),
        ApiUsage.timestamp >= since_time
    ).all()
    
    # Aggregate by API
    api_stats = {}
    for usage in usages:
        api_name = usage.api_name
        if api_name not in api_stats:
            api_stats[api_name] = {
                "api_name": api_name,
                "total_calls": 0,
                "total_duration": 0,
                "avg_duration": 0,
                "error_rate": 0,
                "endpoints": {}
            }
        
        api_stats[api_name]["total_calls"] += 1
        api_stats[api_name]["total_duration"] += usage.duration_ms
        
        endpoint = usage.endpoint
        if endpoint not in api_stats[api_name]["endpoints"]:
            api_stats[api_name]["endpoints"][endpoint] = 0
        api_stats[api_name]["endpoints"][endpoint] += 1
    
    # Calculate averages
    for stats in api_stats.values():
        if stats["total_calls"] > 0:
            stats["avg_duration"] = stats["total_duration"] / stats["total_calls"]
    
    return {
        "agent_id": agent_id,
        "period": period,
        "apis": list(api_stats.values()),
        "total_calls": sum(s["total_calls"] for s in api_stats.values())
    }


@router.get("/versions/{version_id}")
def get_version_usage(version_id: str, period: str = "24h", db: Session = Depends(get_db)):
    """Get API usage statistics for a specific version"""
    version = db.query(Version).filter(Version.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Parse period
    if period.endswith("h"):
        hours = int(period[:-1])
        since_time = datetime.utcnow() - timedelta(hours=hours)
    else:
        raise HTTPException(status_code=400, detail="Invalid period format. Use '24h', '7d', etc.")
    
    usages = db.query(ApiUsage).filter(
        ApiUsage.version_id == version_id,
        ApiUsage.timestamp >= since_time
    ).all()
    
    return {
        "version_id": version_id,
        "agent_id": version.agent_id,
        "period": period,
        "total_calls": len(usages),
        "usages": [
            {
                "id": u.id,
                "api_name": u.api_name,
                "endpoint": u.endpoint,
                "method": u.method,
                "status_code": u.status_code,
                "duration_ms": u.duration_ms,
                "timestamp": u.timestamp.isoformat()
            } for u in usages
        ]
    }


@router.get("/stats")
def get_usage_stats(group_by: str = "agent", period: str = "24h", db: Session = Depends(get_db)):
    """Get aggregated usage statistics"""
    # Parse period
    if period.endswith("h"):
        hours = int(period[:-1])
        since_time = datetime.utcnow() - timedelta(hours=hours)
    else:
        raise HTTPException(status_code=400, detail="Invalid period format. Use '24h', '7d', etc.")
    
    usages = db.query(ApiUsage).filter(ApiUsage.timestamp >= since_time).all()
    
    if group_by == "agent":
        # Group by agent
        agent_stats = {}
        for usage in usages:
            version = db.query(Version).filter(Version.id == usage.version_id).first()
            if version:
                agent_id = version.agent_id
                if agent_id not in agent_stats:
                    agent_stats[agent_id] = {
                        "agent_id": agent_id,
                        "total_calls": 0,
                        "total_duration": 0,
                        "apis_used": set()
                    }
                
                agent_stats[agent_id]["total_calls"] += 1
                agent_stats[agent_id]["total_duration"] += usage.duration_ms
                agent_stats[agent_id]["apis_used"].add(usage.api_name)
        
        # Convert sets to lists
        for stats in agent_stats.values():
            stats["apis_used"] = list(stats["apis_used"])
            if stats["total_calls"] > 0:
                stats["avg_duration"] = stats["total_duration"] / stats["total_calls"]
        
        return {
            "group_by": "agent",
            "period": period,
            "stats": list(agent_stats.values())
        }
    
    elif group_by == "version":
        # Group by version
        version_stats = {}
        for usage in usages:
            version_id = usage.version_id
            if version_id not in version_stats:
                version_stats[version_id] = {
                    "version_id": version_id,
                    "total_calls": 0,
                    "total_duration": 0,
                    "apis_used": set()
                }
            
            version_stats[version_id]["total_calls"] += 1
            version_stats[version_id]["total_duration"] += usage.duration_ms
            version_stats[version_id]["apis_used"].add(usage.api_name)
        
        # Convert sets to lists and add agent info
        for stats in version_stats.values():
            stats["apis_used"] = list(stats["apis_used"])
            if stats["total_calls"] > 0:
                stats["avg_duration"] = stats["total_duration"] / stats["total_calls"]
            
            # Add agent info
            version = db.query(Version).filter(Version.id == stats["version_id"]).first()
            if version:
                stats["agent_id"] = version.agent_id
                stats["version_number"] = version.version_number
        
        return {
            "group_by": "version",
            "period": period,
            "stats": list(version_stats.values())
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid group_by. Use 'agent' or 'version'.")


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