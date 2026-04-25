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
from shared.api_client import create_agent, create_version, list_versions, list_agents

VERSION_AGENT_SEED = os.getenv("VERSION_AGENT_SEED", "canary-version-v1-prod-seed-xyz")

agent = Agent(
    name="canary-version-agent",
    seed=VERSION_AGENT_SEED,
    port=8001,
    mailbox=True,
    publish_agent_details=True,
)

protocol = Protocol(spec=chat_protocol_spec)


def _handle_intent(text: str) -> str:
    t = text.lower()

    if any(w in t for w in ["register", "create agent", "new agent"]):
        lines = text.strip().splitlines()
        name, description = "demo-agent", ""
        for line in lines:
            if "name:" in line.lower():
                name = line.split(":", 1)[1].strip()
            if "description:" in line.lower():
                description = line.split(":", 1)[1].strip()
        result = create_agent(name, description)
        return f"Agent registered.\nID: {result['id']}\nName: {result['name']}"

    if any(w in t for w in ["store version", "save version", "new version", "version this", "snapshot"]):
        lines = text.strip().splitlines()
        agent_id, prompt, created_by = None, None, "user"
        for line in lines:
            if "agent_id:" in line.lower():
                agent_id = line.split(":", 1)[1].strip()
            if "prompt:" in line.lower():
                prompt = line.split(":", 1)[1].strip()
            if "author:" in line.lower() or "by:" in line.lower():
                created_by = line.split(":", 1)[1].strip()
        if not agent_id or not prompt:
            return (
                "To store a version, provide:\n"
                "agent_id: <id>\n"
                "prompt: <your system prompt>\n"
                "author: <your name>"
            )
        result = create_version(agent_id, prompt, created_by=created_by)
        return (
            f"Version {result['version_number']} stored.\n"
            f"Version ID: {result['id']}\n"
            f"Status: {result['status']}"
        )

    if any(w in t for w in ["list versions", "show versions", "all versions", "version history"]):
        lines = text.strip().splitlines()
        agent_id = None
        for line in lines:
            if "agent_id:" in line.lower():
                agent_id = line.split(":", 1)[1].strip()
        if not agent_id:
            return "Please provide:\nagent_id: <id>"
        versions = list_versions(agent_id)
        if not versions:
            return "No versions found for this agent."
        out = [f"Versions for agent {agent_id}:"]
        for v in versions:
            score = f"{v['eval_score']:.0%}" if v.get("eval_score") is not None else "not evaluated"
            out.append(f"  v{v['version_number']} — {v['id']} — {v['status']} — eval: {score}")
        return "\n".join(out)

    if any(w in t for w in ["list agents", "show agents", "all agents"]):
        agents_list = list_agents()
        if not agents_list:
            return "No agents registered yet."
        out = ["Registered agents:"]
        for a in agents_list:
            out.append(f"  {a['name']} — {a['id']} — LKG: {a.get('last_known_good_id', 'none')}")
        return "\n".join(out)

    return (
        "Canary Version Agent — commands:\n"
        "• Register agent:  'register agent\\nname: <name>\\ndescription: <desc>'\n"
        "• Store version:   'store version\\nagent_id: <id>\\nprompt: <prompt>\\nauthor: <name>'\n"
        "• List versions:   'list versions\\nagent_id: <id>'\n"
        "• List agents:     'list agents'"
    )


@protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id
    ))
    text = "".join(item.text for item in msg.content if isinstance(item, TextContent))
    ctx.logger.info(f"Version Agent received: {text[:80]}")
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
