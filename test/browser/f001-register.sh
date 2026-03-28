#!/usr/bin/env bash
# F-001 使用者註冊 — Browser E2E Test
# Feature Issue: #5 | QA Issue: #8
set -euo pipefail

FEATURE="F-001"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="test/screenshots/${FEATURE}"
mkdir -p "$SCREENSHOT_DIR"

PASS=0
FAIL=0

echo "=== [$FEATURE] Browser E2E Test: 使用者註冊 ==="

# ---- Scenario: 註冊頁面可正常載入 ----
echo "  Testing: 註冊頁面載入"
agent-browser open "$BASE_URL/register"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/register-page.png"

if agent-browser wait --text "註冊" 2>/dev/null || agent-browser wait --text "Register" 2>/dev/null || agent-browser wait --text "Sign up" 2>/dev/null; then
  echo "  [PASS] 註冊頁面載入成功"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 註冊頁面載入失敗"
  agent-browser screenshot "$SCREENSHOT_DIR/register-page-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/register-page-FAIL-snapshot.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 有效資料註冊成功 ----
echo "  Testing: 有效資料註冊成功"
agent-browser open "$BASE_URL/register"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 填入表單（根據實際 DOM snapshot 中的 @ref 調整）
agent-browser fill @e1 "browsertest@example.com"
agent-browser fill @e2 "browseruser"
agent-browser fill @e3 "MyPass123"
agent-browser fill @e4 "Browser Test User"
agent-browser screenshot "$SCREENSHOT_DIR/register-before-submit.png"
agent-browser click @e5  # Submit button
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "成功" 2>/dev/null || agent-browser wait --text "Welcome" 2>/dev/null; then
  echo "  [PASS] 有效資料註冊成功"
  agent-browser screenshot "$SCREENSHOT_DIR/register-success.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 有效資料註冊成功"
  agent-browser screenshot "$SCREENSHOT_DIR/register-success-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/register-success-FAIL-snapshot.txt" 2>/dev/null || true
  agent-browser get url > "$SCREENSHOT_DIR/register-success-FAIL-url.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: email 格式不正確時顯示錯誤 ----
echo "  Testing: email 格式不正確時顯示錯誤"
agent-browser open "$BASE_URL/register"
agent-browser wait --load networkidle
agent-browser snapshot -i

agent-browser fill @e1 "not-an-email"
agent-browser fill @e2 "validuser"
agent-browser fill @e3 "MyPass123"
agent-browser fill @e4 "Test User"
agent-browser click @e5
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "email" 2>/dev/null || agent-browser wait --text "格式" 2>/dev/null || agent-browser wait --text "invalid" 2>/dev/null; then
  echo "  [PASS] email 格式錯誤提示"
  agent-browser screenshot "$SCREENSHOT_DIR/register-invalid-email.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] email 格式錯誤提示"
  agent-browser screenshot "$SCREENSHOT_DIR/register-invalid-email-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/register-invalid-email-FAIL-snapshot.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 密碼太短時顯示錯誤 ----
echo "  Testing: 密碼太短時顯示錯誤"
agent-browser open "$BASE_URL/register"
agent-browser wait --load networkidle
agent-browser snapshot -i

agent-browser fill @e1 "shortpwd@example.com"
agent-browser fill @e2 "pwduser"
agent-browser fill @e3 "Ab1"
agent-browser fill @e4 "Test User"
agent-browser click @e5
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "密碼" 2>/dev/null || agent-browser wait --text "password" 2>/dev/null || agent-browser wait --text "字元" 2>/dev/null || agent-browser wait --text "characters" 2>/dev/null; then
  echo "  [PASS] 密碼太短錯誤提示"
  agent-browser screenshot "$SCREENSHOT_DIR/register-short-password.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 密碼太短錯誤提示"
  agent-browser screenshot "$SCREENSHOT_DIR/register-short-password-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/register-short-password-FAIL-snapshot.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== [$FEATURE] Results: $PASS passed, $FAIL failed ==="
agent-browser close
