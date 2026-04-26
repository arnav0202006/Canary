"""Simulates real user traffic hitting a bad agent in production."""
import sys
import time
import httpx
from canary_sdk import Canary

BASE_URL = "http://localhost:8000"
AGENT_ID = sys.argv[1] if len(sys.argv) > 1 else input("Agent ID: ")

# First confirm the current version
resp = httpx.get(f"{BASE_URL}/agents/{AGENT_ID}")
agent = resp.json()
print(f"Current version: {agent.get('current_version_id', 'unknown')}")
print(f"LKG:             {agent.get('last_known_good_id', 'unknown')}")
print()

canary = Canary(base_url=BASE_URL, agent_id=AGENT_ID)

bad_interactions = [
    (
        "I want to return a product I bought 20 days ago.",
        "I'm not sure about our return policy. You might want to check the website.",
    ),
    (
        "My order arrived damaged. What do I do?",
        "That's unfortunate. I'm not sure I can help with that directly.",
    ),
    (
        "I was charged twice for my subscription.",
        "I'm sorry to hear that. Unfortunately I'm not sure how to resolve billing issues.",
    ),
    (
        "What is your cancellation policy?",
        "I'm not entirely sure. Maybe try looking it up online.",
    ),
    (
        "Do you offer discounts for annual subscriptions?",
        "I think so, but I'm not certain of the details.",
    ),
]

print(f"Sending {len(bad_interactions)} bad interactions...")
for user_input, agent_output in bad_interactions:
    canary.log(user_input, agent_output, blocking=True)
    print(f"  ✓ {user_input[:55]}...")

print("\nDone. Monitor will fire within 60 seconds.")
print(f"\nCheck with:")
print(f'  curl -s "http://localhost:8000/agents/{AGENT_ID}/health" | python3 -m json.tool')
