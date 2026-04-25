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
from shared.api_client import diff_versions

DIFF_AGENT_SEED = os.getenv("DIFF_AGENT_SEED", "canary-diff-v1-prod-seed-xyz")

agent = Agent(
    name="canary-diff-agent",
    seed=DIFF_AGENT_SEED,
    port=8002,
    mailbox=True,
    publish_agent_details=True,
)

protocol = Protocol(spec=chat_protocol_spec)


def _parse_version_ids(text: str) -> tuple[str | None, str | None]:
    v_a, v_b = None, None
    for line in text.strip().splitlines():
        ll = line.lower()
        if "version_a:" in ll or "v_a:" in ll or "from:" in ll:
            v_a = line.split(":", 1)[1].strip()
        if "version_b:" in ll or "v_b:" in ll or "to:" in ll:
            v_b = line.split(":", 1)[1].strip()
    return v_a, v_b


def _handle_intent(text: str) -> str:
    t = text.lower()

    if any(w in t for w in ["diff", "compare", "changed", "what changed", "behavioral diff"]):
        v_a, v_b = _parse_version_ids(text)
        if not v_a or not v_b:
            return (
                "To diff two versions, provide:\n"
                "version_a: <version_id>\n"
                "version_b: <version_id>\n\n"
                "Tip: use the Version Agent to list version IDs."
            )
        result = diff_versions(v_a, v_b)
        score_a = f"{result['eval_score_a']:.0%}" if result.get("eval_score_a") is not None else "not evaluated"
        score_b = f"{result['eval_score_b']:.0%}" if result.get("eval_score_b") is not None else "not evaluated"
        return (
            f"Behavioral diff — {v_a} → {v_b}\n"
            f"Eval score A: {score_a}  |  Eval score B: {score_b}\n\n"
            f"{result['behavioral_diff']}"
        )

    return (
        "Canary Diff Agent — compares two agent versions behaviorally.\n\n"
        "Usage:\n"
        "  diff versions\n"
        "  version_a: <id>\n"
        "  version_b: <id>"
    )


@protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id
    ))
    text = "".join(item.text for item in msg.content if isinstance(item, TextContent))
    ctx.logger.info(f"Diff Agent received: {text[:80]}")
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
