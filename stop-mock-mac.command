#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
./stop-mock-mac.sh

printf '\nMock LLM 已停止。\n'
printf 'PID 文件: %s\n' "$DIR/.mock-llm/mock-llm.pid"
printf '\n按回车键关闭窗口。\n'
read -r _
