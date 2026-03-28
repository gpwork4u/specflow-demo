#!/usr/bin/env bash
# 共用 browser test helpers

BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_BASE="test/screenshots"

# 截圖 helper
take_screenshot() {
  local feature="$1"
  local name="$2"
  local dir="${SCREENSHOT_BASE}/${feature}"
  mkdir -p "$dir"
  agent-browser screenshot "${dir}/${name}.png"
}

# 失敗記錄 helper
record_failure() {
  local feature="$1"
  local name="$2"
  local dir="${SCREENSHOT_BASE}/${feature}"
  mkdir -p "$dir"
  agent-browser screenshot "${dir}/${name}-FAIL.png"
  agent-browser snapshot -i > "${dir}/${name}-FAIL-snapshot.txt" 2>/dev/null || true
  agent-browser get url > "${dir}/${name}-FAIL-url.txt" 2>/dev/null || true
}

# 登入 helper
browser_login() {
  local email="$1"
  local password="$2"

  agent-browser open "$BASE_URL/login"
  agent-browser wait --load networkidle
  agent-browser snapshot -i

  # 填入 email 和 password（根據實際 DOM 調整 @ref）
  agent-browser fill @e1 "$email"
  agent-browser fill @e2 "$password"
  agent-browser click @e3
  agent-browser wait --load networkidle
  agent-browser snapshot -i
}

# 等待文字出現（帶 timeout）
wait_for_text() {
  local text="$1"
  if agent-browser wait --text "$text" 2>/dev/null; then
    return 0
  else
    return 1
  fi
}
