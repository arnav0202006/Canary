import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any

from ..database import get_db
from ..models import Agent, Version
from ..schemas import AgentCreate, AgentResponse
from ..services import deploy_service

router = APIRouter(prefix="/agents", tags=["agents"])


class PushRequest(BaseModel):
    name: str
    description: str = ""
    prompt: str
    author: str = "cli"
    eval_threshold: int = 80
    monitor_threshold: int = 70
    traffic_percentage: int = 10
    tools: list = []

    model_config = {"extra": "allow"}


@router.post("", response_model=AgentResponse)
def create_agent(payload: AgentCreate, db: Session = Depends(get_db)):
    agent = Agent(id=str(uuid.uuid4()), name=payload.name, description=payload.description)
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.get("", response_model=list[AgentResponse])
def list_agents(db: Session = Depends(get_db)):
    return db.query(Agent).all()


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: str, payload: AgentCreate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.name = payload.name
    agent.description = payload.description
    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/{agent_id}")
def delete_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted successfully"}


@router.post("/push")
def push_agent(payload: PushRequest, db: Session = Depends(get_db)):
    # Find existing agent by name or create it
    agent = db.query(Agent).filter(Agent.name == payload.name).first()
    if not agent:
        agent = Agent(id=str(uuid.uuid4()), name=payload.name, description=payload.description)
        db.add(agent)
        db.commit()
        db.refresh(agent)

    # Always sync monitor_threshold from the spec
    agent.monitor_threshold = payload.monitor_threshold / 100
    db.commit()

    # Store new version
    existing_count = db.query(Version).filter(Version.agent_id == agent.id).count()
    version = Version(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        version_number=existing_count + 1,
        prompt=payload.prompt,
        created_by=payload.author,
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    # Run full deploy pipeline
    result = deploy_service.deploy(
        db=db,
        agent_id=agent.id,
        version_id=version.id,
        traffic_percentage=payload.traffic_percentage,
        eval_threshold=payload.eval_threshold / 100,
        monitor_threshold=payload.monitor_threshold / 100,
        actor=payload.author,
    )

    return {
        "agent_id": agent.id,
        "agent_name": agent.name,
        "version_id": version.id,
        "version_number": version.version_number,
        **result,
    }
