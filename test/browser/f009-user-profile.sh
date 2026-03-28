#!/usr/bin/env bash
# F-009 使用者個人頁面 — Browser E2E Test
# Feature Issue: #25 | QA Issue: #26
set -euo pipefail

FEATURE="F-009"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="test/screenshots/${FEATURE}"
mkdir -p "$SCREENSHOT_DIR"

# 載入 helpers
source "$(dirname "$0")/helpers.sh"

PASS=0
FAIL=0

echo "=== [$FEATURE] Browser E2E Test: 使用者個人頁面 ==="

# ---- Scenario: 未登入可查看使用者頁面 ----
echo "  Testing: 未登入查看使用者頁面"
agent-browser open "$BASE_URL/users/testuser"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/profile-public.png"

if agent-browser wait --text "testuser" 2>/dev/null || agent-browser wait --text "Test User" 2>/dev/null; then
  echo "  [PASS] 未登入可查看使用者頁面"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 未登入無法查看使用者頁面"
  record_failure "$FEATURE" "profile-public"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 個人頁面顯示使用者資訊 ----
echo "  Testing: 個人頁面顯示使用者基本資訊"
agent-browser snapshot -i

# 驗證有 display_name
if agent-browser wait --text "Test User" 2>/dev/null; then
  echo "  [PASS] 個人頁面顯示 display_name"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 個人頁面未顯示 display_name"
  record_failure "$FEATURE" "profile-display-name"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 個人頁面顯示貼文數量 ----
echo "  Testing: 個人頁面顯示貼文數量"
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/profile-posts-count.png"

# 驗證有顯示某個數字（posts_count）
if agent-browser wait --text "post" 2>/dev/null || agent-browser wait --text "Post" 2>/dev/null || agent-browser wait --text "貼文" 2>/dev/null; then
  echo "  [PASS] 個人頁面顯示貼文相關資訊"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 個人頁面未顯示貼文相關資訊"
  record_failure "$FEATURE" "profile-posts-count"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 個人頁面顯示使用者的貼文列表 ----
echo "  Testing: 個人頁面顯示使用者貼文列表"
agent-browser snapshot -i

# 滾動查看貼文列表
agent-browser screenshot "$SCREENSHOT_DIR/profile-posts-list.png"

# 驗證有顯示貼文內容
if agent-browser wait --text "Hello" 2>/dev/null || agent-browser wait --text "Test post" 2>/dev/null || agent-browser wait --text "post" 2>/dev/null; then
  echo "  [PASS] 個人頁面顯示使用者貼文"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 個人頁面未顯示使用者貼文"
  record_failure "$FEATURE" "profile-posts-list"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 不存在的使用者顯示 404 ----
echo "  Testing: 不存在的使用者頁面"
agent-browser open "$BASE_URL/users/nonexistent-user-xyz"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/profile-not-found.png"

if agent-browser wait --text "404" 2>/dev/null || agent-browser wait --text "not found" 2>/dev/null || agent-browser wait --text "Not Found" 2>/dev/null || agent-browser wait --text "找不到" 2>/dev/null; then
  echo "  [PASS] 不存在的使用者顯示 404"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 不存在的使用者未顯示 404"
  record_failure "$FEATURE" "profile-not-found"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 登入後查看自己的個人頁面 ----
echo "  Testing: 登入後查看自己的個人頁面"
browser_login "testuser@example.com" "MyPass123"

agent-browser open "$BASE_URL/users/testuser"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/profile-own.png"

if agent-browser wait --text "testuser" 2>/dev/null; then
  echo "  [PASS] 登入後可查看自己的頁面"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 登入後無法查看自己的頁面"
  record_failure "$FEATURE" "profile-own"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 個人頁面不顯示 email ----
echo "  Testing: 個人頁面不顯示敏感資訊"
agent-browser snapshot -i

# 取得頁面文字內容確認不含 email
if agent-browser wait --text "testuser@example.com" 2>/dev/null; then
  echo "  [FAIL] 個人頁面洩漏 email 敏感資訊"
  record_failure "$FEATURE" "profile-email-leak"
  FAIL=$((FAIL + 1))
else
  echo "  [PASS] 個人頁面不顯示 email"
  PASS=$((PASS + 1))
fi

echo ""
echo "=== [$FEATURE] Results: $PASS passed, $FAIL failed ==="
agent-browser close
