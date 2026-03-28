#!/usr/bin/env bash
# F-007 按讚與取消按讚 — Browser E2E Test
# Feature Issue: #23 | QA Issue: #26
set -euo pipefail

FEATURE="F-007"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="test/screenshots/${FEATURE}"
mkdir -p "$SCREENSHOT_DIR"

# 載入 helpers
source "$(dirname "$0")/helpers.sh"

PASS=0
FAIL=0

echo "=== [$FEATURE] Browser E2E Test: 按讚與取消按讚 ==="

# ---- 前置：登入 ----
echo "  Setup: 登入測試帳號"
browser_login "testuser@example.com" "MyPass123"

# ---- Scenario: 貼文列表頁顯示讚數 ----
echo "  Testing: 貼文列表頁顯示讚數"
agent-browser open "$BASE_URL/posts"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/posts-list.png"

if agent-browser wait --text "0" 2>/dev/null; then
  echo "  [PASS] 貼文列表頁可載入"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 貼文列表頁載入失敗"
  record_failure "$FEATURE" "posts-list"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 按讚功能 ----
echo "  Testing: 點擊按讚按鈕"
agent-browser open "$BASE_URL/posts"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 找到按讚按鈕並點擊（根據實際 DOM snapshot 中的 @ref 調整）
agent-browser screenshot "$SCREENSHOT_DIR/before-like.png"
agent-browser click @e1  # Like button（需根據 snapshot 調整）
agent-browser wait --load networkidle
agent-browser snapshot -i

agent-browser screenshot "$SCREENSHOT_DIR/after-like.png"

# 驗證讚數或按讚狀態變化
if agent-browser wait --text "1" 2>/dev/null || agent-browser wait --text "liked" 2>/dev/null; then
  echo "  [PASS] 按讚成功，讚數更新"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 按讚後讚數未更新"
  record_failure "$FEATURE" "like-click"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 取消按讚 ----
echo "  Testing: 取消按讚"
agent-browser snapshot -i

# 再次點擊按讚按鈕（toggle unlike）
agent-browser click @e1  # Unlike button
agent-browser wait --load networkidle
agent-browser snapshot -i

agent-browser screenshot "$SCREENSHOT_DIR/after-unlike.png"

if agent-browser wait --text "0" 2>/dev/null || ! agent-browser wait --text "liked" 2>/dev/null; then
  echo "  [PASS] 取消按讚成功"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 取消按讚失敗"
  record_failure "$FEATURE" "unlike-click"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 貼文詳情頁顯示按讚狀態 ----
echo "  Testing: 貼文詳情頁顯示按讚狀態"
agent-browser open "$BASE_URL/posts"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 點擊進入某篇貼文
agent-browser click @e1  # First post link
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/post-detail-like.png"

# 驗證有按讚按鈕
if agent-browser wait --text "like" 2>/dev/null || agent-browser wait --text "Like" 2>/dev/null; then
  echo "  [PASS] 貼文詳情頁有按讚按鈕"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 貼文詳情頁缺少按讚按鈕"
  record_failure "$FEATURE" "detail-like-button"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== [$FEATURE] Results: $PASS passed, $FAIL failed ==="
agent-browser close
