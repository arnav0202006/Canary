import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List

import anthropic

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
_TEST_SUITE_PATH = Path(__file__).parent.parent.parent / "evals" / "test_suite.json"


def load_test_suite() -> list:
    with open(_TEST_SUITE_PATH) as f:
        return json.load(f)


def _get_agent_response(system_prompt: str, user_input: str) -> str:
    response = _client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=system_prompt,
        messages=[{"role": "user", "content": user_input}],
    )
    return response.content[0].text


def _judge_response(input_text: str, expected: str, actual: str, criteria: str) -> tuple[float, str]:
    judge_prompt = f"""You are a strict evaluator for a customer support AI agent. Score whether the actual response meets the expected behavior.

User message: {input_text}
Expected behavior: {expected}
Evaluation criteria: {criteria}
Actual response: {actual}

Respond with valid JSON only, no extra text:
{{"score": 0 or 1, "reasoning": "one sentence explanation"}}

Score 1 only if ALL criteria are clearly met. Score 0 if any criterion is violated or missing."""

    response = _client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{"role": "user", "content": judge_prompt}],
    )
    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    result = json.loads(raw)
    return float(result["score"]), result["reasoning"]


def _run_test_case(tc: dict, prompt: str) -> dict:
    actual = _get_agent_response(prompt, tc["input"])
    score, reasoning = _judge_response(tc["input"], tc["expected_output"], actual, tc["criteria"])
    return {
        "test_case_id": tc["id"],
        "input": tc["input"],
        "expected_output": tc["expected_output"],
        "actual_output": actual,
        "score": score,
        "reasoning": reasoning,
    }


def run_eval(version_id: str, prompt: str, threshold: float = 0.90) -> dict:
    test_suite = load_test_suite()

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(_run_test_case, tc, prompt): tc for tc in test_suite}
        results = [f.result() for f in as_completed(futures)]

    overall_score = sum(r["score"] for r in results) / len(results)
    return {
        "version_id": version_id,
        "overall_score": round(overall_score, 4),
        "results": results,
        "passed": overall_score >= threshold,
        "threshold": threshold,
    }


def diff_versions(prompt_a: str, prompt_b: str, version_id_a: str, version_id_b: str) -> str:
    test_suite = load_test_suite()
    comparisons: List[str] = []

    for tc in test_suite[:5]:  # use first 5 cases for diff to keep latency reasonable
        resp_a = _get_agent_response(prompt_a, tc["input"])
        resp_b = _get_agent_response(prompt_b, tc["input"])
        comparisons.append(
            f"Scenario: {tc['input']}\n"
            f"Version A: {resp_a}\n"
            f"Version B: {resp_b}"
        )

    combined = "\n\n---\n\n".join(comparisons)

    diff_prompt = f"""You are a behavioral analyst comparing two versions of a customer support AI agent.

Below are side-by-side responses from Version A ({version_id_a}) and Version B ({version_id_b}) across several test scenarios.

{combined}

Provide a concise behavioral diff (3-5 bullet points) that explains:
- What changed in tone, policy handling, or response strategy
- Any regressions (things Version B does worse than A)
- Any improvements (things Version B does better than A)

Be specific. Reference the scenarios above."""

    response = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": diff_prompt}],
    )
    return response.content[0].text
