import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any

from ..database import get_db
from ..models import Agent
from ..schemas import AgentCreate, AgentResponse

router = APIRouter(prefix="/agents", tags=["agents"])

class PushRequest(BaseModel):
    agent_spec: Optional[Dict[str, Any]] = None
    agent_id: Optional[str] = None
    create_if_missing: bool = True
    message: Optional[str] = ""
    source: str = "cli"
    
    class Config:
        extra = "allow"  # Allow extra fields that CLI might send


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
    """Push agent specification from CLI"""
    try:
        agent_id = payload.agent_id or str(uuid.uuid4())
        
        # Check if agent exists
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        
        if agent:
            # Update existing agent
            if payload.agent_spec:
                agent.name = payload.agent_spec.get("name", agent.name)
                agent.description = payload.agent_spec.get("description", agent.description)
            db.commit()
            db.refresh(agent)
            return {"message": "Agent updated successfully", "agent_id": agent_id}
        else:
            # Create new agent
            if not payload.create_if_missing:
                raise HTTPException(status_code=404, detail="Agent not found and create_if_missing is False")
            
            # Extract name and description from agent_spec if provided
            name = "CLI Agent"
            description = payload.message or "Pushed from CLI"
            
            if payload.agent_spec:
                name = payload.agent_spec.get("name", name)
                description = payload.agent_spec.get("description", description)
            
            agent = Agent(
                id=agent_id,
                name=name,
                description=description
            )
            db.add(agent)
            db.commit()
            db.refresh(agent)
            return {"message": "Agent created successfully", "agent_id": agent_id}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to push agent: {str(e)}")
