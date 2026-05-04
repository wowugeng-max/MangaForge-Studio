#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/.mock-llm"
PID_FILE="$LOG_DIR/mock-llm.pid"
LOG_FILE="$LOG_DIR/mock-llm.log"

if [[ ! -f "$PID_FILE" ]]; then
  echo "Mock LLM is not running"
  exit 0
fi

PID="$(cat "$PID_FILE" || true)"
if [[ -z "$PID" ]]; then
  echo "Mock LLM pid file is empty"
  rm -f "$PID_FILE"
  exit 1
fi

if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Mock LLM stopped (pid: $PID)"
else
  echo "Mock LLM process not found (pid: $PID)"
fi

rm -f "$PID_FILE"
