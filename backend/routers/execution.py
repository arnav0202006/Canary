from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..database import get_db
from ..services.agent_executor import agent_executor

router = APIRouter(prefix="/agents", tags=["execution"])


@router.post("/{agent_id}/execute")
def execute_agent(
    agent_id: str,
    user_input: str,
    context: Dict[str, Any] = None,
    db: Session = Depends(get_db)
):
    """
    Executes an agent with full monitoring and guardrail enforcement.
    Automatically handles violations and ensures safe responses.
    """
    try:
        result = agent_executor.execute_with_monitoring(
            db=db,
            agent_id=agent_id,
            user_input=user_input,
            context=context
        )

        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")