#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/.mock-llm"
PID_FILE="$LOG_DIR/mock-llm.pid"
LOG_FILE="$LOG_DIR/mock-llm.log"
PORT="${PORT:-3001}"

mkdir -p "$LOG_DIR"

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" || true)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Mock LLM already running (pid: $OLD_PID)"
    exit 0
  fi
fi

cd "$ROOT_DIR"
PORT="$PORT" nohup bun "ui/server/mock-llm-server.ts" > "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"
echo "Mock LLM started (pid: $NEW_PID, port: $PORT)"
