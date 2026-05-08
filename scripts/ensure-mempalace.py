#!/usr/bin/env python3
"""
Bootstrap helper: ensures mempalace is importable under the given Python.

Called at server startup from memory-service.ts.

Strategy:
  1. Try importing mempalace — if it works, done.
  2. Try pip install mempalace under the current Python.
  3. If numpy/Python version incompatibility is detected,
     fall back to SQLite mode (print JSON with ok=false).

Usage:
  python3 scripts/ensure-mempalace.py

Prints JSON to stdout:
  {"ok": true,  "python": "...", "installed": true/false}
  {"ok": false, "error": "...", "fallback": "sqlite"}
"""
import json
import os
import subprocess
import sys
from pathlib import Path


def main():
    # ── 0. Already installed? ──────────────────────────────────────────
    try:
        __import__("mempalace")
        print(json.dumps({
            "ok": True,
            "python": sys.executable,
            "installed": False,
            "note": "already_available",
        }))
        return
    except ImportError:
        pass

    # ── 1. Try pip install ─────────────────────────────────────────────
    py = sys.executable
    print(f"[mempalace] Attempting pip install under {py} (Python {sys.version.split()[0]}) ...", file=sys.stderr)
    try:
        # Prefer --break-system-packages; fall back to --user
        extra_flags = []
        # Detect if we're in a venv
        in_venv = (
            hasattr(sys, "real_prefix")
            or (getattr(sys, "base_prefix", None) != sys.prefix)
        )
        if not in_venv:
            # Try --break-system-packages first
            try:
                subprocess.check_output(
                    [py, "-m", "pip", "install", "--break-system-packages", "--quiet", "mempalace"],
                    stderr=subprocess.PIPE, timeout=300,
                    env={**os.environ, "PIP_USER": "0"},
                )
                extra_flags = ["--break-system-packages"]
            except Exception:
                # Fall back to --user
                subprocess.check_output(
                    [py, "-m", "pip", "install", "--user", "--quiet", "mempalace"],
                    stderr=subprocess.PIPE, timeout=300,
                    env={**os.environ, "PIP_USER": "1"},
                )
                extra_flags = ["--user"]
        else:
            # Inside a venv — no extra flags needed
            subprocess.check_output(
                [py, "-m", "pip", "install", "--quiet", "mempalace"],
                stderr=subprocess.PIPE, timeout=300,
                env={**os.environ, "PIP_USER": "0"},
            )

        # Verify import
        __import__("importlib").invalidate_caches()
        __import__("mempalace")
        print(json.dumps({
            "ok": True,
            "python": py,
            "installed": True,
        }))
        return

    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode("utf-8", errors="replace") if e.stderr else ""
        # Check for numpy / Python version incompatibility
        if "numpy" in stderr or "requires-python" in stderr or "Python version" in stderr:
            msg = (
                f"mempalace depends on chromadb → numpy which does not yet support Python {sys.version.split()[0]}. "
                "Using SQLite fallback mode. Consider installing Python 3.12 or 3.13 for full vector search support."
            )
        else:
            msg = f"pip install mempalace failed: {stderr.strip()[:200]}"
        print(json.dumps({
            "ok": False,
            "error": msg,
            "fallback": "sqlite",
        }))
        return

    except Exception as e:
        print(json.dumps({
            "ok": False,
            "error": f"mempalace install error: {str(e)[:300]}",
            "fallback": "sqlite",
        }))
        return


if __name__ == "__main__":
    main()
