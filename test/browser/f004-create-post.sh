#!/usr/bin/env bash
# F-004 建立貼文 — Browser E2E Test
# Feature Issue: #14 | QA Issue: #17
set -euo pipefail

FEATURE="F-004"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="test/screenshots/${FEATURE}"
mkdir -p "$SCREENSHOT_DIR"

# 載入 helpers
source "$(dirname "$0")/helpers.sh"

PASS=0
FAIL=0

echo "=== [$FEATURE] Browser E2E Test: 建立貼文 ==="

# ---- 前置：登入 ----
echo "  Setup: 登入測試帳號"
browser_login "testuser@example.com" "MyPass123"

# ---- Scenario: 建立貼文頁面可正常載入 ----
echo "  Testing: 建立貼文頁面載入"
agent-browser open "$BASE_URL/posts/new"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/create-page.png"

if agent-browser wait --text "建立" 2>/dev/null || agent-browser wait --text "發文" 2>/dev/null || agent-browser wait --text "Create" 2>/dev/null || agent-browser wait --text "Post" 2>/dev/null; then
  echo "  [PASS] 建立貼文頁面載入成功"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 建立貼文頁面載入失敗"
  record_failure "$FEATURE" "create-page"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 成功建立貼文 ----
echo "  Testing: 成功建立貼文"
agent-browser open "$BASE_URL/posts/new"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 填入貼文內容（根據實際 DOM snapshot 中的 @ref 調整）
agent-browser fill @e1 "Hello World! Browser test post."
agent-browser screenshot "$SCREENSHOT_DIR/create-before-submit.png"
agent-browser click @e2  # Submit button
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "成功" 2>/dev/null || agent-browser wait --text "Hello World" 2>/dev/null || agent-browser wait --text "Success" 2>/dev/null; then
  echo "  [PASS] 成功建立貼文"
  agent-browser screenshot "$SCREENSHOT_DIR/create-success.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 成功建立貼文"
  record_failure "$FEATURE" "create-success"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 空內容送出顯示錯誤 ----
echo "  Testing: 空內容送出顯示錯誤"
agent-browser open "$BASE_URL/posts/new"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 不填入內容直接送出
agent-browser click @e2  # Submit without filling
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "必填" 2>/dev/null || agent-browser wait --text "required" 2>/dev/null || agent-browser wait --text "不能為空" 2>/dev/null || agent-browser wait --text "內容" 2>/dev/null; then
  echo "  [PASS] 空內容顯示錯誤"
  agent-browser screenshot "$SCREENSHOT_DIR/create-empty-error.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 空內容顯示錯誤"
  record_failure "$FEATURE" "create-empty-error"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 建立貼文後顯示 author 資訊 ----
echo "  Testing: 貼文顯示 author 資訊"
agent-browser open "$BASE_URL/posts/new"
agent-browser wait --load networkidle
agent-browser snapshot -i

agent-browser fill @e1 "Author info test post"
agent-browser click @e2
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "testuser" 2>/dev/null; then
  echo "  [PASS] 貼文顯示 author 資訊"
  agent-browser screenshot "$SCREENSHOT_DIR/create-author-info.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 貼文顯示 author 資訊"
  record_failure "$FEATURE" "create-author-info"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== [$FEATURE] Results: $PASS passed, $FAIL failed ==="
agent-browser close
