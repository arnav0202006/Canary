from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AgentCreate(BaseModel):
    name: str
    description: str = ""


class AgentResponse(BaseModel):
    id: str
    name: str
    description: str
    current_version_id: Optional[str]
    last_known_good_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class VersionCreate(BaseModel):
    prompt: str
    tools_config: dict = {}
    metadata: dict = {}
    state: dict = {}
    context: dict = {}
    parent_version_id: Optional[str] = None
    created_by: str = "system"


class VersionResponse(BaseModel):
    id: str
    agent_id: str
    version_number: int
    prompt: str
    eval_score: Optional[float]
    status: str
    created_at: datetime
    created_by: str

    model_config = {"from_attributes": True}


class DiffRequest(BaseModel):
    version_id_a: str
    version_id_b: str


class DiffResponse(BaseModel):
    version_id_a: str
    version_id_b: str
    behavioral_diff: str
    eval_score_a: Optional[float]
    eval_score_b: Optional[float]


class DeployRequest(BaseModel):
    version_id: str
    traffic_percentage: int = 10
    eval_threshold: float = 0.90
    monitor_threshold: float = 0.70


class DeployResponse(BaseModel):
    deployment_id: str
    agent_id: str
    version_id: str
    status: str
    eval_score: Optional[float]
    message: str


class RollbackResponse(BaseModel):
    agent_id: str
    rolled_back_to_version_id: str
    message: str


class EvalResultItem(BaseModel):
    test_case_id: str
    input: str
    expected_output: str
    actual_output: str
    score: float
    reasoning: str


class EvalResponse(BaseModel):
    version_id: str
    overall_score: float
    results: List[EvalResultItem]
    passed: bool
    threshold: float


class AuditLogResponse(BaseModel):
    id: str
    agent_id: str
    version_id: Optional[str]
    action: str
    actor: str
    details: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiUsageCreate(BaseModel):
    api_name: str
    endpoint: str
    method: str = "GET"
    request_payload: dict = {}
    response_payload: dict = {}
    status_code: Optional[int] = None
    duration_ms: Optional[int] = None


class ApiUsageResponse(BaseModel):
    id: str
    version_id: str
    api_name: str
    endpoint: str
    method: str
    request_payload: str
    response_payload: str
    status_code: Optional[int]
    duration_ms: Optional[int]
    timestamp: datetime

    model_config = {"from_attributes": True}
