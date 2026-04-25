"""Boot all 4 Canary agents in separate processes."""
import subprocess
import sys
import os

AGENTS = [
    "agents/version_agent.py",
    "agents/diff_agent.py",
    "agents/deploy_agent.py",
    "agents/audit_agent.py",
]

if __name__ == "__main__":
    procs = []
    for agent_path in AGENTS:
        p = subprocess.Popen(
            [sys.executable, agent_path],
            cwd=os.path.dirname(os.path.abspath(__file__)),
        )
        print(f"Started {agent_path} (pid {p.pid})")
        procs.append(p)

    print("\nAll agents running. Ctrl+C to stop.")
    try:
        for p in procs:
            p.wait()
    except KeyboardInterrupt:
        print("\nStopping agents...")
        for p in procs:
            p.terminate()
