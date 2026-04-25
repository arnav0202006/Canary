import os
import asyncio
from datetime import datetime
from uuid import uuid4
from dotenv import load_dotenv
load_dotenv()

asyncio.set_event_loop(asyncio.new_event_loop())

from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)
from shared.api_client import deploy, rollback

DEPLOY_AGENT_SEED = os.getenv("DEPLOY_AGENT_SEED", "canary-deploy-v1-prod-seed-xyz")

agent = Agent(
    name="canary-deploy-agent",
    seed=DEPLOY_AGENT_SEED,
    port=8003,
    mailbox=True,
    publish_agent_details=True,
)

protocol = Protocol(spec=chat_protocol_spec)


def _parse_deploy_params(text: str) -> dict:
    params = {"agent_id": None, "version_id": None, "traffic_percentage": 10, "eval_threshold": 0.90}
    for line in text.strip().splitlines():
        ll = line.lower()
        if "agent_id:" in ll:
            params["agent_id"] = line.split(":", 1)[1].strip()
        if "version_id:" in ll:
            params["version_id"] = line.split(":", 1)[1].strip()
        if "traffic:" in ll or "traffic_percentage:" in ll:
            try:
                val = line.split(":", 1)[1].strip().replace("%", "")
                params["traffic_percentage"] = int(val)
            except ValueError:
                pass
        if "threshold:" in ll or "eval_threshold:" in ll:
            try:
                val = float(line.split(":", 1)[1].strip().replace("%", ""))
                params["eval_threshold"] = val if val <= 1 else val / 100
            except ValueError:
                pass
    return params


def _handle_intent(text: str) -> str:
    t = text.lower()

    if any(w in t for w in ["deploy", "release", "ship", "promote"]):
        params = _parse_deploy_params(text)
        if not params["agent_id"] or not params["version_id"]:
            return (
                "To deploy a version, provide:\n"
                "agent_id: <id>\n"
                "version_id: <id>\n"
                "traffic: 10       (optional, default 10%)\n"
                "threshold: 90     (optional, default 90%)"
            )
        result = deploy(
            params["agent_id"],
            params["version_id"],
            params["traffic_percentage"],
            params["eval_threshold"],
        )
        status_emoji = {"production": "✓", "rejected": "✗", "rolled_back": "⟲"}.get(result["status"], "?")
        score = f"{result['eval_score']:.0%}" if result.get("eval_score") is not None else "n/a"
        return (
            f"{status_emoji} Deploy result: {result['status'].upper()}\n"
            f"Eval score: {score}\n\n"
            f"{result['message']}"
        )

    if any(w in t for w in ["rollback", "revert", "undo", "restore"]):
        agent_id = None
        for line in text.strip().splitlines():
            if "agent_id:" in line.lower():
                agent_id = line.split(":", 1)[1].strip()
        if not agent_id:
            return "To rollback, provide:\nagent_id: <id>"
        result = rollback(agent_id)
        return (
            f"Rolled back agent {agent_id}.\n"
            f"Active version: {result['rolled_back_to_version_id']}\n\n"
            f"{result['message']}"
        )

    return (
        "Canary Deploy Agent — staged deployments with auto-rollback.\n\n"
        "Commands:\n"
        "• Deploy:    'deploy version\\nagent_id: <id>\\nversion_id: <id>\\ntraffic: 10\\nthreshold: 90'\n"
        "• Rollback:  'rollback\\nagent_id: <id>'"
    )


@protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id
    ))
    text = "".join(item.text for item in msg.content if isinstance(item, TextContent))
    ctx.logger.info(f"Deploy Agent received: {text[:80]}")
    try:
        reply = _handle_intent(text)
    except Exception as e:
        reply = f"Error: {e}"
    await ctx.send(sender, ChatMessage(
        timestamp=datetime.utcnow(),
        msg_id=uuid4(),
        content=[
            TextContent(type="text", text=reply),
            EndSessionContent(type="end-session"),
        ],
    ))


@protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass


agent.include(protocol, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
