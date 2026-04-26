import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models import Agent, Version, ApiUsage
from ..services.production_monitor import production_monitor
from .eval_service import _get_agent_response


class AgentExecutor:
    """Handles agent execution with built-in monitoring and guardrails"""

    def __init__(self):
        self.monitor = production_monitor

    def execute_with_monitoring(self, db: Session, agent_id: str, user_input: str,
                               version_id: Optional[str] = None,
                               context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Executes an agent request with full monitoring and guardrail enforcement.
        If version_id is provided, that specific version is used instead of the
        agent's current active version.
        """
        # Get current agent
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            return {
                "error": "Agent not found",
                "agent_id": agent_id
            }

        # Resolve which version to run
        resolved_version_id = version_id or agent.current_version_id
        if not resolved_version_id:
            return {
                "error": "Agent not found or no active version",
                "agent_id": agent_id
            }

        version = db.query(Version).filter(Version.id == resolved_version_id).first()
        if not version:
            return {
                "error": "Version not found",
                "agent_id": agent_id,
                "version_id": resolved_version_id
            }

        # Prepare the system prompt with context
        system_prompt = self._build_system_prompt(version, context)

        try:
            # Get agent response
            agent_output = _get_agent_response(system_prompt, user_input)

            # Track API usage (Claude API call)
            self._track_api_usage(db, version.id, "claude_api", "/messages",
                                {"model": "claude-sonnet-4-6", "user_input": user_input},
                                {"response": agent_output})

            # Monitor the production request
            monitoring_result = self.monitor.monitor_production_request(
                db=db,
                agent_id=agent_id,
                user_input=user_input,
                agent_output=agent_output,
                context=context
            )

            # Check if request was blocked due to violations
            if not monitoring_result["is_safe"]:
                critical_violations = [v for v in monitoring_result["violations"]
                                     if v.get("severity") == "critical"]

                if critical_violations:
                    # Return safe response instead of failing
                    agent_output = self._generate_safe_response(critical_violations, user_input)

            return {
                "agent_id": agent_id,
                "version_id": version.id,
                "user_input": user_input,
                "agent_output": agent_output,
                "monitoring_result": monitoring_result,
                "executed_at": monitoring_result["timestamp"],
                "is_safe": monitoring_result["is_safe"]
            }

        except Exception as e:
            # Log the error and return safe response
            self._track_api_usage(db, version.id, "claude_api", "/messages",
                                {"error": str(e)}, {"error_response": "safe_fallback"})

            return {
                "agent_id": agent_id,
                "version_id": version.id,
                "user_input": user_input,
                "agent_output": self._generate_error_response(user_input),
                "error": str(e),
                "is_safe": False
            }

    def _build_system_prompt(self, version: Version, context: Dict[str, Any] = None) -> str:
        """Builds the complete system prompt including context"""
        prompt_parts = [version.prompt]

        # Add stored context if available
        if version.context:
            try:
                stored_context = json.loads(version.context)
                if stored_context.get("conversation_history"):
                    prompt_parts.append(f"\nConversation History: {json.dumps(stored_context['conversation_history'])}")
                if stored_context.get("user_preferences"):
                    prompt_parts.append(f"\nUser Preferences: {json.dumps(stored_context['user_preferences'])}")
            except:
                pass

        # Add runtime context
        if context:
            if context.get("user_info"):
                prompt_parts.append(f"\nUser Information: {json.dumps(context['user_info'])}")
            if context.get("session_data"):
                prompt_parts.append(f"\nSession Data: {json.dumps(context['session_data'])}")

        return "\n".join(prompt_parts)

    def _track_api_usage(self, db: Session, version_id: str, api_name: str,
                        endpoint: str, request_data: Dict[str, Any],
                        response_data: Dict[str, Any], status_code: int = 200,
                        duration_ms: int = 0):
        """Tracks API usage for auditing"""
        try:
            usage = ApiUsage(
                version_id=version_id,
                api_name=api_name,
                endpoint=endpoint,
                method="POST",
                request_payload=json.dumps(request_data),
                response_payload=json.dumps(response_data),
                status_code=status_code,
                duration_ms=duration_ms
            )
            db.add(usage)
            db.commit()
        except Exception as e:
            # Log but don't fail the request
            print(f"Failed to track API usage: {e}")

    def _generate_safe_response(self, violations: list, user_input: str) -> str:
        """Generates a safe response when violations are detected"""
        violation_types = [v.get("rule", "unknown") for v in violations]

        if "behavioral_inconsistency" in violation_types:
            return "I understand your request. Let me connect you with a human representative who can better assist you with this matter."

        elif "frequent_failures" in violation_types:
            return "I apologize for any inconvenience. A human representative will contact you shortly to help resolve your issue."

        elif "potential_hallucination" in violation_types:
            return "I need to verify some information. Let me connect you with a human representative who can provide accurate assistance."

        elif "inappropriate_actions" in violation_types:
            return "For security reasons, I need to escalate this request. A human representative will contact you shortly."

        else:
            return "I apologize, but I need to escalate this request to ensure you receive the best possible assistance. A human representative will contact you shortly."

    def _generate_error_response(self, user_input: str) -> str:
        """Generates a safe response when errors occur"""
        return "I apologize, but I'm experiencing technical difficulties. A human representative will contact you shortly to assist with your request."


# Global executor instance
agent_executor = AgentExecutor()