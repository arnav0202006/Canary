"""
Canary SDK — instrument any agent with one line.

Usage:
    from canary_sdk import Canary

    canary = Canary(base_url="http://localhost:8000", agent_id="<your-agent-id>")

    # After every agent interaction:
    response = my_agent.run(user_message)
    canary.log(user_message, response)
"""

import threading
try:
    import httpx
except ImportError:
    httpx = None


class Canary:
    def __init__(self, base_url: str, agent_id: str):
        self.base_url = base_url.rstrip("/")
        self.agent_id = agent_id

    def log(self, user_input: str, agent_output: str, context: dict = None, blocking: bool = False):
        """
        Log a real production interaction to Canary.
        Non-blocking by default — fires in a background thread so it never slows your agent down.
        """
        if httpx is None:
            return

        def _send():
            try:
                with httpx.Client(timeout=10.0) as client:
                    client.post(
                        f"{self.base_url}/agents/{self.agent_id}/monitor",
                        params={"user_input": user_input, "agent_output": agent_output},
                        json=context or {},
                    )
            except Exception:
                pass  # Never crash the agent due to monitoring failures

        if blocking:
            _send()
        else:
            threading.Thread(target=_send, daemon=True).start()
