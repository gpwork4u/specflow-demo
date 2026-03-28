#!/usr/bin/env bash
# F-002 使用者登入 — Browser E2E Test
# Feature Issue: #6 | QA Issue: #8
set -euo pipefail

FEATURE="F-002"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="test/screenshots/${FEATURE}"
mkdir -p "$SCREENSHOT_DIR"

PASS=0
FAIL=0

echo "=== [$FEATURE] Browser E2E Test: 使用者登入 ==="

# ---- Scenario: 登入頁面可正常載入 ----
echo "  Testing: 登入頁面載入"
agent-browser open "$BASE_URL/login"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/login-page.png"

if agent-browser wait --text "登入" 2>/dev/null || agent-browser wait --text "Login" 2>/dev/null || agent-browser wait --text "Sign in" 2>/dev/null; then
  echo "  [PASS] 登入頁面載入成功"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 登入頁面載入失敗"
  agent-browser screenshot "$SCREENSHOT_DIR/login-page-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/login-page-FAIL-snapshot.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 正確帳密登入成功 ----
echo "  Testing: 正確帳密登入成功"
agent-browser open "$BASE_URL/login"
agent-browser wait --load networkidle
agent-browser snapshot -i

agent-browser fill @e1 "browsertest@example.com"
agent-browser fill @e2 "MyPass123"
agent-browser screenshot "$SCREENSHOT_DIR/login-before-submit.png"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "歡迎" 2>/dev/null || agent-browser wait --text "Welcome" 2>/dev/null || agent-browser wait --text "Dashboard" 2>/dev/null; then
  echo "  [PASS] 正確帳密登入成功"
  agent-browser screenshot "$SCREENSHOT_DIR/login-success.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 正確帳密登入成功"
  agent-browser screenshot "$SCREENSHOT_DIR/login-success-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/login-success-FAIL-snapshot.txt" 2>/dev/null || true
  agent-browser get url > "$SCREENSHOT_DIR/login-success-FAIL-url.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 錯誤密碼顯示錯誤訊息 ----
echo "  Testing: 錯誤密碼顯示錯誤訊息"
agent-browser open "$BASE_URL/login"
agent-browser wait --load networkidle
agent-browser snapshot -i

agent-browser fill @e1 "browsertest@example.com"
agent-browser fill @e2 "WrongPassword999"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "incorrect" 2>/dev/null || agent-browser wait --text "錯誤" 2>/dev/null || agent-browser wait --text "Error" 2>/dev/null; then
  echo "  [PASS] 錯誤密碼顯示錯誤訊息"
  agent-browser screenshot "$SCREENSHOT_DIR/login-wrong-password.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 錯誤密碼顯示錯誤訊息"
  agent-browser screenshot "$SCREENSHOT_DIR/login-wrong-password-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/login-wrong-password-FAIL-snapshot.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 缺少欄位時顯示驗證錯誤 ----
echo "  Testing: 缺少欄位時顯示驗證錯誤"
agent-browser open "$BASE_URL/login"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 不填任何欄位直接送出
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "必填" 2>/dev/null || agent-browser wait --text "required" 2>/dev/null || agent-browser wait --text "欄位" 2>/dev/null; then
  echo "  [PASS] 缺少欄位驗證錯誤"
  agent-browser screenshot "$SCREENSHOT_DIR/login-missing-fields.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 缺少欄位驗證錯誤"
  agent-browser screenshot "$SCREENSHOT_DIR/login-missing-fields-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/login-missing-fields-FAIL-snapshot.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== [$FEATURE] Results: $PASS passed, $FAIL failed ==="
agent-browser close
