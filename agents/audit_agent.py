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
from shared.api_client import get_audit_log, get_version_at_time

AUDIT_AGENT_SEED = os.getenv("AUDIT_AGENT_SEED", "canary-audit-v1-prod-seed-xyz")

agent = Agent(
    name="canary-audit-agent",
    seed=AUDIT_AGENT_SEED,
    port=8004,
    mailbox=True,
    publish_agent_details=True,
)

protocol = Protocol(spec=chat_protocol_spec)


def _handle_intent(text: str) -> str:
    t = text.lower()
    lines = text.strip().splitlines()
    agent_id, timestamp, since = None, None, None

    for line in lines:
        ll = line.lower()
        if "agent_id:" in ll:
            agent_id = line.split(":", 1)[1].strip()
        if "timestamp:" in ll or "at:" in ll:
            timestamp = line.split(":", 1)[1].strip()
        if "since:" in ll:
            since = line.split(":", 1)[1].strip()

    if any(w in t for w in ["what version", "which version", "active at", "running at", "version at"]):
        if not agent_id or not timestamp:
            return (
                "To look up the active version at a specific time, provide:\n"
                "agent_id: <id>\n"
                "timestamp: 2025-04-18T14:34:00"
            )
        result = get_version_at_time(agent_id, timestamp)
        if not result.get("active_version_id"):
            return f"No deployment found before {timestamp} for agent {agent_id}."
        return (
            f"At {timestamp}, agent {agent_id} was running:\n"
            f"Version: v{result['version_number']} ({result['active_version_id']})\n"
            f"Status: {result['version_status']}\n"
            f"Event: {result['event']} at {result['event_time']}"
        )

    if any(w in t for w in ["audit", "history", "log", "trail", "what happened"]):
        if not agent_id:
            return "Please provide:\nagent_id: <id>\nsince: 2025-04-01T00:00:00  (optional)"
        logs = get_audit_log(agent_id, since=since)
        if not logs:
            return f"No audit events found for agent {agent_id}."
        out = [f"Audit trail for agent {agent_id}:"]
        for log in logs[:20]:
            out.append(f"  [{log['created_at']}] {log['action']} — version: {log.get('version_id', 'n/a')} — by: {log['actor']}")
        if len(logs) > 20:
            out.append(f"  ... and {len(logs) - 20} more events.")
        return "\n".join(out)

    return (
        "Canary Audit Agent — immutable run history and version replay.\n\n"
        "Commands:\n"
        "• Full audit log:   'audit log\\nagent_id: <id>\\nsince: 2025-04-01T00:00:00'\n"
        "• Version at time:  'what version was running at\\nagent_id: <id>\\ntimestamp: 2025-04-18T14:34:00'"
    )


@protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id
    ))
    text = "".join(item.text for item in msg.content if isinstance(item, TextContent))
    ctx.logger.info(f"Audit Agent received: {text[:80]}")
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
