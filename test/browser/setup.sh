#!/usr/bin/env bash
# agent-browser 初始化腳本
# 使用前請確認已安裝：npm install -g agent-browser && agent-browser install

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== agent-browser Setup ==="
echo "Base URL: $BASE_URL"

# 確認 agent-browser 已安裝
if ! command -v agent-browser &>/dev/null; then
  echo "ERROR: agent-browser not found. Please install:"
  echo "  npm install -g agent-browser && agent-browser install"
  exit 1
fi

echo "agent-browser version: $(agent-browser --version 2>/dev/null || echo 'unknown')"

# 確認目標服務可達
if ! curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -qE "^[23]"; then
  echo "WARNING: $BASE_URL is not reachable. Make sure the app is running."
fi

echo "=== Setup Complete ==="
