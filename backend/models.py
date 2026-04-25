from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .database import Base


def _gen_id() -> str:
    return str(uuid.uuid4())


class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, default=_gen_id)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    current_version_id = Column(String, nullable=True)
    last_known_good_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    versions = relationship("Version", back_populates="agent", foreign_keys="Version.agent_id")
    audit_logs = relationship("AuditLog", back_populates="agent")
    deployments = relationship("Deployment", back_populates="agent")


class Version(Base):
    __tablename__ = "versions"

    id = Column(String, primary_key=True, default=_gen_id)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    prompt = Column(Text, nullable=False)
    tools_config = Column(Text, default="{}")   # JSON string
    metadata_ = Column("metadata", Text, default="{}")  # JSON string
    eval_score = Column(Float, nullable=True)
    # pending → tested → canary → production | rejected | rolled_back
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, default="system")

    agent = relationship("Agent", back_populates="versions", foreign_keys=[agent_id])
    eval_results = relationship("EvalResult", back_populates="version")


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(String, primary_key=True, default=_gen_id)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    version_id = Column(String, ForeignKey("versions.id"), nullable=False)
    # pending → canary → production | failed | rolled_back
    status = Column(String, default="pending")
    traffic_percentage = Column(Integer, default=10)
    eval_threshold = Column(Float, default=0.90)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    agent = relationship("Agent", back_populates="deployments")
    version = relationship("Version")


class EvalResult(Base):
    __tablename__ = "eval_results"

    id = Column(String, primary_key=True, default=_gen_id)
    version_id = Column(String, ForeignKey("versions.id"), nullable=False)
    test_case_id = Column(String, nullable=False)
    input = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    actual_output = Column(Text, nullable=False)
    score = Column(Float, nullable=False)
    reasoning = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    version = relationship("Version", back_populates="eval_results")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=_gen_id)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    version_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    actor = Column(String, default="system")
    details = Column(Text, default="{}")  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

    agent = relationship("Agent", back_populates="audit_logs")
