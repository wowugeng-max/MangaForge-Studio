#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
osascript <<EOF
 tell application "Terminal"
   do script "cd '$script_dir' && ./start-ui-mac.sh"
 end tell
EOF
