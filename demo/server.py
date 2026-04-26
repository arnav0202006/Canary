#!/usr/bin/env python3
"""
Demo proxy server.

Serves the demo/ folder as static files and proxies /api/* requests to the
FastAPI backend at http://localhost:8000 so the browser never hits a cross-origin
request (the backend's CORS allow-list only includes http://localhost:3000).

Usage:
    python demo/server.py            # serves on http://localhost:3001
    python demo/server.py 3000       # serves on http://localhost:3000
"""

import http.server
import sys
import urllib.request
import urllib.error
from pathlib import Path

BACKEND = "http://localhost:8000"
DEMO_DIR = Path(__file__).parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DEMO_DIR), **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self._proxy()
        else:
            self.send_error(405)

    def do_PATCH(self):
        if self.path.startswith("/api/"):
            self._proxy()
        else:
            self.send_error(405)

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            self._proxy()
        else:
            self.send_error(405)

    def _proxy(self):
        backend_path = self.path[len("/api"):]  # strip /api prefix
        url = BACKEND + backend_path

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length else None

        headers = {
            k: v for k, v in self.headers.items()
            if k.lower() not in ("host", "content-length")
        }

        req = urllib.request.Request(url, data=body, headers=headers, method=self.command)

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                self.send_response(resp.status)
                for key, val in resp.headers.items():
                    if key.lower() not in ("transfer-encoding",):
                        self.send_header(key, val)
                self.end_headers()
                self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for key, val in e.headers.items():
                if key.lower() not in ("transfer-encoding",):
                    self.send_header(key, val)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_error(502, str(e))

    def log_message(self, fmt, *args):
        try:
            first = str(args[0]) if args else ""
            parts = first.split()
            method = parts[0] if parts else ""
            path = parts[1] if len(parts) > 1 else first
            tag = " → proxy" if path.startswith("/api/") else ""
            print(f"  {method} {path}{tag}")
        except Exception:
            pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
    print(f"Demo server running at http://localhost:{port}")
    print(f"  Static files from: {DEMO_DIR}")
    print(f"  API proxy: /api/* → {BACKEND}")
    print("  Press Ctrl-C to stop.\n")
    with http.server.HTTPServer(("", port), Handler) as httpd:
        httpd.serve_forever()
