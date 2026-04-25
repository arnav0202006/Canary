#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import typer

try:
    import httpx
except ImportError:
    httpx = None

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

try:
    from rich.console import Console
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.table import Table
except ImportError:
    Console = None
    Progress = None
    SpinnerColumn = None
    TextColumn = None
    Table = None


APP_NAME = "canary"
CONFIG_DIR = Path(".canary")
CONFIG_FILE = CONFIG_DIR / "config.json"
DEFAULT_BASE_URL = "http://localhost:8000"

app = typer.Typer(help="Canary CLI - AI agent CI/CD control plane")
agent_app = typer.Typer(help="Agent management commands")
version_app = typer.Typer(help="Version management commands")
eval_app = typer.Typer(help="Evaluation pipeline commands")
deploy_app = typer.Typer(help="Deployment commands")
monitor_app = typer.Typer(help="Production monitoring commands")
audit_app = typer.Typer(help="Audit and logging commands")
usage_app = typer.Typer(help="Usage analytics commands")
config_app = typer.Typer(help="Configuration commands")
auth_app = typer.Typer(help="Authentication commands")

app.add_typer(agent_app, name="agent")
app.add_typer(version_app, name="version")
app.add_typer(eval_app, name="eval")
app.add_typer(deploy_app, name="deploy")
app.add_typer(monitor_app, name="monitor")
app.add_typer(audit_app, name="audit")
app.add_typer(usage_app, name="usage")
app.add_typer(config_app, name="config")
app.add_typer(auth_app, name="auth")


@dataclass
class RuntimeContext:
    base_url: str
    api_key: Optional[str]
    dry_run: bool
    verbose: bool
    output: str
    console: Any


def _console() -> Any:
    if Console:
        return Console()
    return None


def _echo(message: str, style: Optional[str] = None) -> None:
    if Console:
        _console().print(message, style=style)
    else:
        print(message)


def _ensure_deps() -> None:
    missing = []
    if httpx is None:
        missing.append("httpx")
    if load_dotenv is None:
        missing.append("python-dotenv")
    if missing:
        raise typer.BadParameter(
            f"Missing dependencies: {', '.join(missing)}. Install with: pip install typer httpx python-dotenv rich"
        )


def _ensure_config_dir() -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def _read_config() -> Dict[str, Any]:
    if not CONFIG_FILE.exists():
        return {}
    return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))


def _write_config(data: Dict[str, Any]) -> None:
    _ensure_config_dir()
    CONFIG_FILE.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _parse_json(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise typer.BadParameter(f"Invalid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise typer.BadParameter("Expected JSON object.")
    return parsed


def _read_local_agent_spec(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise typer.BadParameter(f"Path not found: {path}")
    if path.is_file():
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise typer.BadParameter("Agent spec file must be a JSON object.")
        return data
    for candidate in ("canary.agent.json", "agent.json"):
        candidate_path = path / candidate
        if candidate_path.exists():
            data = json.loads(candidate_path.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                raise typer.BadParameter(f"{candidate} must be a JSON object.")
            return data
    raise typer.BadParameter(
        f"No agent spec found in {path}. Add canary.agent.json or pass a JSON file path."
    )


def _render(ctx: RuntimeContext, payload: Any, title: str = "Result") -> None:
    if ctx.output == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    if ctx.output == "table" and isinstance(payload, list) and payload and isinstance(payload[0], dict):
        if Table is None:
            print(json.dumps(payload, indent=2, sort_keys=True))
            return
        table = Table(title=title)
        for col in payload[0].keys():
            table.add_column(str(col))
        for row in payload:
            table.add_row(*[str(row.get(k, "")) for k in payload[0].keys()])
        _console().print(table)
        return
    _echo(json.dumps(payload, indent=2, sort_keys=True))


def _ctx(typer_ctx: typer.Context) -> RuntimeContext:
    cfg = _read_config()
    base_url = cfg.get("base_url", DEFAULT_BASE_URL)
    api_key = cfg.get("api_key")
    return RuntimeContext(
        base_url=base_url,
        api_key=api_key,
        dry_run=bool(typer_ctx.obj.get("dry_run")),
        verbose=bool(typer_ctx.obj.get("verbose")),
        output=typer_ctx.obj.get("output", "human"),
        console=_console(),
    )


def _save_auth_tokens(access_token: str, refresh_token: Optional[str], user: Optional[Dict[str, Any]] = None) -> None:
    cfg = _read_config()
    cfg["api_key"] = access_token
    if refresh_token:
        cfg["refresh_token"] = refresh_token
    if user:
        cfg["auth_user"] = user
    _write_config(cfg)


def _clear_auth_tokens() -> None:
    cfg = _read_config()
    for key in ("api_key", "refresh_token", "auth_user"):
        cfg.pop(key, None)
    _write_config(cfg)


def _headers(ctx: RuntimeContext) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if ctx.api_key:
        headers["Authorization"] = f"Bearer {ctx.api_key}"
    return headers


def _request(
    ctx: RuntimeContext,
    method: str,
    path: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
) -> Any:
    url = f"{ctx.base_url.rstrip('/')}{path}"
    if ctx.dry_run:
        return {
            "dry_run": True,
            "request": {"method": method, "url": url, "params": params or {}, "json": json_body or {}},
        }
    if httpx is None:
        raise typer.Exit(code=2)
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.request(
                method,
                url,
                params=params,
                json=json_body,
                headers=_headers(ctx),
            )
            resp.raise_for_status()
            if not resp.content:
                return {"ok": True}
            return resp.json()
    except Exception as exc:
        raise typer.BadParameter(f"API request failed: {exc}") from exc


def _progress(label: str):
    if Progress is None:
        return None
    return Progress(SpinnerColumn(), TextColumn("{task.description}"))


@app.callback()
def root_callback(
    ctx: typer.Context,
    verbose: bool = typer.Option(False, "-v", "--verbose", help="Verbose logging"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show request without executing"),
    output: str = typer.Option("human", "--output", help="Output format: human|json|table"),
    interactive: bool = typer.Option(False, "--interactive", help="Guided workflow mode"),
) -> None:
    _ensure_deps()
    load_dotenv()
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose
    ctx.obj["dry_run"] = dry_run
    ctx.obj["output"] = output
    if interactive:
        run_interactive(ctx)
        raise typer.Exit()


@app.command("init")
def init_cmd(database: str = typer.Option("sqlite:///canary.db", "--database")) -> None:
    cfg = _read_config()
    cfg.setdefault("base_url", DEFAULT_BASE_URL)
    cfg["database_url"] = database
    _write_config(cfg)
    _echo(f"Initialized {APP_NAME} config at {CONFIG_FILE}", style="green")


@config_app.command("set")
def config_set_cmd(key: str, value: str) -> None:
    cfg = _read_config()
    if key == "anthropic-api-key":
        cfg["anthropic_api_key"] = value
    elif key == "database-url":
        cfg["database_url"] = value
    elif key == "base-url":
        cfg["base_url"] = value
    elif key == "api-key":
        cfg["api_key"] = value
    else:
        raise typer.BadParameter("Unsupported key. Use anthropic-api-key|database-url|base-url|api-key")
    _write_config(cfg)
    _echo(f"Set {key}", style="green")


@config_app.command("show")
def config_show_cmd() -> None:
    cfg = _read_config()
    safe = dict(cfg)
    for k in ("api_key", "anthropic_api_key"):
        if k in safe and safe[k]:
            safe[k] = f"{safe[k][:6]}...{safe[k][-4:]}"
    print(json.dumps(safe, indent=2, sort_keys=True))


@app.command("doctor")
def doctor_cmd(ctx: typer.Context) -> None:
    runtime = _ctx(ctx)
    checks = [
        {"check": "config_exists", "ok": CONFIG_FILE.exists()},
        {"check": "base_url_set", "ok": bool(runtime.base_url)},
        {"check": "api_key_set", "ok": bool(runtime.api_key)},
    ]
    _render(runtime, checks, title="Doctor Checks")


@auth_app.command("login")
def auth_login(
    ctx: typer.Context,
    api_key: Optional[str] = typer.Option(None, "--api-key", help="Personal access token"),
    email: Optional[str] = typer.Option(None, "--email"),
    password: Optional[str] = typer.Option(None, "--password", hide_input=True),
) -> None:
    runtime = _ctx(ctx)
    if api_key:
        _save_auth_tokens(api_key, None)
        _echo("Authenticated with API key.", style="green")
        return

    if not email:
        email = typer.prompt("Email")
    if not password:
        password = typer.prompt("Password", hide_input=True)
    payload = _request(runtime, "POST", "/auth/login", json_body={"email": email, "password": password})
    access_token = payload.get("access_token")
    refresh_token = payload.get("refresh_token")
    user = payload.get("user")
    if not access_token:
        raise typer.BadParameter("Login response missing access_token.")
    _save_auth_tokens(access_token, refresh_token, user)
    _echo("Login successful.", style="green")


@auth_app.command("logout")
def auth_logout() -> None:
    _clear_auth_tokens()
    _echo("Logged out locally.", style="yellow")


@auth_app.command("status")
def auth_status(ctx: typer.Context) -> None:
    runtime = _ctx(ctx)
    cfg = _read_config()
    if not runtime.api_key:
        _echo("Not authenticated. Run `canary auth login`.", style="red")
        raise typer.Exit(code=1)
    token_preview = f"{runtime.api_key[:6]}...{runtime.api_key[-4:]}" if len(runtime.api_key) > 10 else "set"
    result = {"authenticated": True, "token": token_preview, "user": cfg.get("auth_user")}
    _render(runtime, result, title="Auth Status")


@agent_app.command("create")
def agent_create(ctx: typer.Context, name: str, description: str = typer.Option("", "--description")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "POST", "/agents", json_body={"name": name, "description": description})
    _render(runtime, payload, title="Agent Created")


@agent_app.command("list")
def agent_list(ctx: typer.Context, status: str = typer.Option("all", "--status")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", "/agents", params={"status": status})
    _render(runtime, payload, title="Agents")


@agent_app.command("get")
def agent_get(ctx: typer.Context, agent_id: str) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/agents/{agent_id}")
    _render(runtime, payload, title="Agent")


@agent_app.command("update")
def agent_update(
    ctx: typer.Context,
    agent_id: str,
    name: Optional[str] = typer.Option(None, "--name"),
    description: Optional[str] = typer.Option(None, "--description"),
) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "PATCH", f"/agents/{agent_id}", json_body={"name": name, "description": description})
    _render(runtime, payload, title="Agent Updated")


@agent_app.command("delete")
def agent_delete(ctx: typer.Context, agent_id: str, force: bool = typer.Option(False, "--force")) -> None:
    if not force:
        raise typer.BadParameter("Use --force to delete an agent.")
    runtime = _ctx(ctx)
    payload = _request(runtime, "DELETE", f"/agents/{agent_id}")
    _render(runtime, payload, title="Agent Deleted")


@agent_app.command("push")
def agent_push(
    ctx: typer.Context,
    path: str = typer.Argument(".", help="Agent spec file or directory"),
    agent_id: Optional[str] = typer.Option(None, "--agent-id", help="Target agent ID"),
    create_if_missing: bool = typer.Option(True, "--create-if-missing/--no-create-if-missing"),
    message: str = typer.Option("CLI push", "--message"),
) -> None:
    runtime = _ctx(ctx)
    if not runtime.api_key:
        raise typer.BadParameter("Not authenticated. Run `canary auth login` first.")

    agent_spec = _read_local_agent_spec(Path(path))
    payload = _request(
        runtime,
        "POST",
        "/agents/push",
        json_body={
            "agent_id": agent_id,
            "create_if_missing": create_if_missing,
            "message": message,
            "source": "cli",
            "agent_spec": agent_spec,
        },
    )
    _render(runtime, payload, title="Agent Push")


@version_app.command("create")
def version_create(
    ctx: typer.Context,
    agent_id: str,
    prompt: str = typer.Option(..., "--prompt"),
    tools_config: str = typer.Option("{}", "--tools-config"),
    parent_version: Optional[str] = typer.Option(None, "--parent-version"),
    metadata: str = typer.Option("{}", "--metadata"),
) -> None:
    runtime = _ctx(ctx)
    payload = _request(
        runtime,
        "POST",
        f"/agents/{agent_id}/versions",
        json_body={
            "prompt": prompt,
            "tools_config": _parse_json(tools_config),
            "parent_version_id": parent_version,
            "metadata": _parse_json(metadata),
        },
    )
    _render(runtime, payload, title="Version Created")


@version_app.command("list")
def version_list(ctx: typer.Context, agent_id: str, status: str = typer.Option("all", "--status")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/agents/{agent_id}/versions", params={"status": status})
    _render(runtime, payload, title="Versions")


@version_app.command("get")
def version_get(ctx: typer.Context, version_id: str) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/versions/{version_id}")
    _render(runtime, payload, title="Version")


@version_app.command("update")
def version_update(
    ctx: typer.Context,
    version_id: str,
    prompt: Optional[str] = typer.Option(None, "--prompt"),
) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "PATCH", f"/versions/{version_id}", json_body={"prompt": prompt})
    _render(runtime, payload, title="Version Updated")


@version_app.command("delete")
def version_delete(ctx: typer.Context, version_id: str, force: bool = typer.Option(False, "--force")) -> None:
    if not force:
        raise typer.BadParameter("Use --force to delete a version.")
    runtime = _ctx(ctx)
    payload = _request(runtime, "DELETE", f"/versions/{version_id}")
    _render(runtime, payload, title="Version Deleted")


@eval_app.command("run")
def eval_run(
    ctx: typer.Context,
    version_id: str,
    threshold: float = typer.Option(0.8, "--threshold"),
    test_suite: str = typer.Option(..., "--test-suite"),
) -> None:
    runtime = _ctx(ctx)
    suite_path = Path(test_suite)
    if not suite_path.exists():
        raise typer.BadParameter(f"Test suite not found: {test_suite}")
    suite = json.loads(suite_path.read_text(encoding="utf-8"))
    progress = _progress("Running evaluation")
    if progress:
        with progress:
            progress.add_task(description="Evaluating...", total=None)
            payload = _request(
                runtime,
                "POST",
                f"/versions/{version_id}/evals",
                json_body={"threshold": threshold, "test_suite": suite},
            )
    else:
        payload = _request(
            runtime,
            "POST",
            f"/versions/{version_id}/evals",
            json_body={"threshold": threshold, "test_suite": suite},
        )
    _render(runtime, payload, title="Evaluation Result")


@eval_app.command("results")
def eval_results(
    ctx: typer.Context,
    version_id: str,
    latest: bool = typer.Option(False, "--latest"),
    eval_id: Optional[str] = typer.Option(None, "--eval-id"),
) -> None:
    runtime = _ctx(ctx)
    params = {"latest": latest, "eval_id": eval_id}
    payload = _request(runtime, "GET", f"/versions/{version_id}/evals/results", params=params)
    _render(runtime, payload, title="Evaluation Results")


@eval_app.command("list")
def eval_list(ctx: typer.Context, agent_id: str, status: str = typer.Option("all", "--status")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/agents/{agent_id}/evals", params={"status": status})
    _render(runtime, payload, title="Evaluations")


@deploy_app.command("canary")
def deploy_canary(
    ctx: typer.Context,
    version_id: str,
    traffic_percent: int = typer.Option(10, "--traffic-percent"),
    eval_threshold: float = typer.Option(0.85, "--eval-threshold"),
) -> None:
    runtime = _ctx(ctx)
    payload = _request(
        runtime,
        "POST",
        "/deployments/canary",
        json_body={
            "version_id": version_id,
            "traffic_percent": traffic_percent,
            "eval_threshold": eval_threshold,
        },
    )
    _render(runtime, payload, title="Canary Deployment")


@deploy_app.command("promote")
def deploy_promote(ctx: typer.Context, deployment_id: str) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "POST", f"/deployments/{deployment_id}/promote")
    _render(runtime, payload, title="Promoted Deployment")


@deploy_app.command("rollback")
def deploy_rollback(ctx: typer.Context, agent_id: str, to_version: Optional[str] = typer.Option(None, "--to-version")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "POST", f"/agents/{agent_id}/rollback", json_body={"to_version": to_version})
    _render(runtime, payload, title="Rollback Executed")


@deploy_app.command("list")
def deploy_list(ctx: typer.Context, agent_id: str, status: str = typer.Option("all", "--status")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/agents/{agent_id}/deployments", params={"status": status})
    _render(runtime, payload, title="Deployments")


@deploy_app.command("status")
def deploy_status(ctx: typer.Context, deployment_id: str) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/deployments/{deployment_id}")
    _render(runtime, payload, title="Deployment Status")


@monitor_app.command("start")
def monitor_start(ctx: typer.Context, agent_id: str, log_level: str = typer.Option("info", "--log-level")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "POST", f"/agents/{agent_id}/monitor/start", json_body={"log_level": log_level})
    _render(runtime, payload, title="Monitoring Started")


@monitor_app.command("status")
def monitor_status(ctx: typer.Context, agent_id: str) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/agents/{agent_id}/monitor/status")
    _render(runtime, payload, title="Monitoring Status")


@monitor_app.command("violations")
def monitor_violations(ctx: typer.Context, agent_id: str, hours: int = typer.Option(24, "--hours")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/agents/{agent_id}/monitor/violations", params={"hours": hours})
    _render(runtime, payload, title="Recent Violations")


@monitor_app.command("metrics")
def monitor_metrics(ctx: typer.Context, agent_id: str, period: str = typer.Option("1h", "--period")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/agents/{agent_id}/monitor/metrics", params={"period": period})
    _render(runtime, payload, title="Risk Metrics")


@audit_app.command("logs")
def audit_logs(
    ctx: typer.Context,
    agent_id: str,
    action: Optional[str] = typer.Option(None, "--action"),
    since: Optional[str] = typer.Option(None, "--since"),
    limit: int = typer.Option(50, "--limit"),
) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/agents/{agent_id}/audit/logs", params={"action": action, "since": since, "limit": limit})
    _render(runtime, payload, title="Audit Logs")


@audit_app.command("export")
def audit_export(
    ctx: typer.Context,
    agent_id: str,
    format: str = typer.Option("json", "--format"),
    output: str = typer.Option(..., "--output"),
) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/agents/{agent_id}/audit/logs", params={"limit": 10000})
    out_path = Path(output)
    if format == "json":
        out_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    elif format == "csv":
        rows = payload if isinstance(payload, list) else []
        if rows:
            with out_path.open("w", encoding="utf-8", newline="") as fp:
                writer = csv.DictWriter(fp, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                writer.writerows(rows)
        else:
            out_path.write_text("", encoding="utf-8")
    else:
        raise typer.BadParameter("format must be json|csv")
    _echo(f"Exported logs to {out_path}", style="green")


@audit_app.command("search")
def audit_search(ctx: typer.Context, query: str, agent_id: Optional[str] = typer.Option(None, "--agent-id")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", "/audit/search", params={"q": query, "agent_id": agent_id})
    _render(runtime, payload, title="Audit Search")


@usage_app.command("agent")
def usage_agent(ctx: typer.Context, agent_id: str, period: str = typer.Option("24h", "--period")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/usage/agents/{agent_id}", params={"period": period})
    _render(runtime, payload, title="Agent Usage")


@usage_app.command("version")
def usage_version(ctx: typer.Context, version_id: str, period: str = typer.Option("24h", "--period")) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", f"/usage/versions/{version_id}", params={"period": period})
    _render(runtime, payload, title="Version Usage")


@usage_app.command("stats")
def usage_stats(
    ctx: typer.Context,
    agent_id: Optional[str] = typer.Option(None, "--agent-id"),
    group_by: str = typer.Option("version", "--group-by"),
) -> None:
    runtime = _ctx(ctx)
    payload = _request(runtime, "GET", "/usage/stats", params={"agent_id": agent_id, "group_by": group_by})
    _render(runtime, payload, title="Usage Stats")


def run_interactive(ctx: typer.Context) -> None:
    runtime = _ctx(ctx)
    _echo("Interactive mode enabled", style="cyan")
    choice = typer.prompt("Choose workflow (setup|deploy)", default="setup")
    if choice == "setup":
        base_url = typer.prompt("Backend URL", default=runtime.base_url)
        api_key = typer.prompt("API key", default=runtime.api_key or "", hide_input=True)
        cfg = _read_config()
        cfg["base_url"] = base_url
        if api_key:
            cfg["api_key"] = api_key
        _write_config(cfg)
        _echo("Configuration saved.", style="green")
    elif choice == "deploy":
        version_id = typer.prompt("Version ID")
        traffic = int(typer.prompt("Canary traffic percent", default="10"))
        payload = _request(
            runtime,
            "POST",
            "/deployments/canary",
            json_body={"version_id": version_id, "traffic_percent": traffic, "eval_threshold": 0.85},
        )
        _render(runtime, payload, title="Interactive Canary Deploy")
    else:
        _echo("Unknown workflow.", style="yellow")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
