import os
import httpx

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
_timeout = httpx.Timeout(120.0)  # evals take time


def create_agent(name: str, description: str = "") -> dict:
    with httpx.Client(timeout=_timeout) as client:
        r = client.post(f"{BACKEND_URL}/agents", json={"name": name, "description": description})
        r.raise_for_status()
        return r.json()


def create_version(agent_id: str, prompt: str, tools_config: dict = None, metadata: dict = None, created_by: str = "user") -> dict:
    with httpx.Client(timeout=_timeout) as client:
        r = client.post(f"{BACKEND_URL}/agents/{agent_id}/versions", json={
            "prompt": prompt,
            "tools_config": tools_config or {},
            "metadata": metadata or {},
            "created_by": created_by,
        })
        r.raise_for_status()
        return r.json()


def list_versions(agent_id: str) -> list:
    with httpx.Client(timeout=_timeout) as client:
        r = client.get(f"{BACKEND_URL}/agents/{agent_id}/versions")
        r.raise_for_status()
        return r.json()


def get_version(agent_id: str, version_id: str) -> dict:
    with httpx.Client(timeout=_timeout) as client:
        r = client.get(f"{BACKEND_URL}/agents/{agent_id}/versions/{version_id}")
        r.raise_for_status()
        return r.json()


def diff_versions(version_id_a: str, version_id_b: str) -> dict:
    with httpx.Client(timeout=_timeout) as client:
        r = client.post(f"{BACKEND_URL}/agents/diff", json={
            "version_id_a": version_id_a,
            "version_id_b": version_id_b,
        })
        r.raise_for_status()
        return r.json()


def deploy(agent_id: str, version_id: str, traffic_percentage: int = 10, eval_threshold: float = 0.90) -> dict:
    with httpx.Client(timeout=_timeout) as client:
        r = client.post(f"{BACKEND_URL}/agents/{agent_id}/deploy", json={
            "version_id": version_id,
            "traffic_percentage": traffic_percentage,
            "eval_threshold": eval_threshold,
        })
        r.raise_for_status()
        return r.json()


def rollback(agent_id: str) -> dict:
    with httpx.Client(timeout=_timeout) as client:
        r = client.post(f"{BACKEND_URL}/agents/{agent_id}/rollback")
        r.raise_for_status()
        return r.json()


def get_audit_log(agent_id: str, since: str = None) -> list:
    with httpx.Client(timeout=_timeout) as client:
        params = {"since": since} if since else {}
        r = client.get(f"{BACKEND_URL}/agents/{agent_id}/audit", params=params)
        r.raise_for_status()
        return r.json()


def get_version_at_time(agent_id: str, timestamp: str) -> dict:
    with httpx.Client(timeout=_timeout) as client:
        r = client.get(f"{BACKEND_URL}/agents/{agent_id}/audit/at", params={"timestamp": timestamp})
        r.raise_for_status()
        return r.json()


def list_agents() -> list:
    with httpx.Client(timeout=_timeout) as client:
        r = client.get(f"{BACKEND_URL}/agents")
        r.raise_for_status()
        return r.json()
