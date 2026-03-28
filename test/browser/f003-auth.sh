#!/usr/bin/env bash
# F-003 使用者登出與身份驗證 — Browser E2E Test
# Feature Issue: #7 | QA Issue: #8
set -euo pipefail

FEATURE="F-003"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="test/screenshots/${FEATURE}"
mkdir -p "$SCREENSHOT_DIR"

PASS=0
FAIL=0

echo "=== [$FEATURE] Browser E2E Test: 登出與身份驗證 ==="

# ---- 前置：先登入 ----
echo "  Setup: 登入取得 session"
agent-browser open "$BASE_URL/login"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser fill @e1 "browsertest@example.com"
agent-browser fill @e2 "MyPass123"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i

# ---- Scenario: 已登入使用者可存取個人頁面 ----
echo "  Testing: 已登入使用者可存取個人頁面"
agent-browser open "$BASE_URL/profile"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/profile-page.png"

if agent-browser wait --text "browsertest" 2>/dev/null || agent-browser wait --text "Browser Test User" 2>/dev/null || agent-browser wait --text "profile" 2>/dev/null; then
  echo "  [PASS] 已登入使用者可存取個人頁面"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 已登入使用者可存取個人頁面"
  agent-browser screenshot "$SCREENSHOT_DIR/profile-page-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/profile-page-FAIL-snapshot.txt" 2>/dev/null || true
  agent-browser get url > "$SCREENSHOT_DIR/profile-page-FAIL-url.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 登出成功 ----
echo "  Testing: 登出成功"
agent-browser snapshot -i

# 尋找登出按鈕（可能是 navbar 中的 logout/登出）
# 注意：實際 @ref 需根據 snapshot 輸出調整
agent-browser open "$BASE_URL/profile"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 嘗試點擊登出
if agent-browser click @e10 2>/dev/null; then
  agent-browser wait --load networkidle
  agent-browser snapshot -i
elif agent-browser click @e8 2>/dev/null; then
  agent-browser wait --load networkidle
  agent-browser snapshot -i
fi

agent-browser screenshot "$SCREENSHOT_DIR/after-logout.png"

# 確認被導回登入頁或首頁
CURRENT_URL=$(agent-browser get url 2>/dev/null || echo "")
if echo "$CURRENT_URL" | grep -qE "(login|/\$)" 2>/dev/null; then
  echo "  [PASS] 登出成功，導回登入頁"
  PASS=$((PASS + 1))
elif agent-browser wait --text "登入" 2>/dev/null || agent-browser wait --text "Login" 2>/dev/null; then
  echo "  [PASS] 登出成功，顯示登入頁"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 登出成功"
  agent-browser screenshot "$SCREENSHOT_DIR/logout-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/logout-FAIL-snapshot.txt" 2>/dev/null || true
  agent-browser get url > "$SCREENSHOT_DIR/logout-FAIL-url.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 登出後無法存取保護頁面 ----
echo "  Testing: 登出後無法存取保護頁面"
agent-browser open "$BASE_URL/profile"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/after-logout-access-profile.png"

CURRENT_URL=$(agent-browser get url 2>/dev/null || echo "")
if echo "$CURRENT_URL" | grep -q "login" 2>/dev/null; then
  echo "  [PASS] 登出後被重導至登入頁"
  PASS=$((PASS + 1))
elif agent-browser wait --text "登入" 2>/dev/null || agent-browser wait --text "Login" 2>/dev/null || agent-browser wait --text "Unauthorized" 2>/dev/null; then
  echo "  [PASS] 登出後顯示未授權或登入提示"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 登出後仍可存取保護頁面"
  agent-browser screenshot "$SCREENSHOT_DIR/after-logout-profile-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/after-logout-profile-FAIL-snapshot.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 未登入直接存取保護頁面 ----
echo "  Testing: 未登入直接存取保護頁面"
# 開一個新 browser session（清除 cookie）
agent-browser close
agent-browser open "$BASE_URL/profile"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/unauthenticated-profile.png"

CURRENT_URL=$(agent-browser get url 2>/dev/null || echo "")
if echo "$CURRENT_URL" | grep -q "login" 2>/dev/null; then
  echo "  [PASS] 未登入被重導至登入頁"
  PASS=$((PASS + 1))
elif agent-browser wait --text "登入" 2>/dev/null || agent-browser wait --text "Login" 2>/dev/null; then
  echo "  [PASS] 未登入顯示登入頁面"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 未登入仍可存取保護頁面"
  agent-browser screenshot "$SCREENSHOT_DIR/unauthenticated-FAIL.png"
  agent-browser snapshot -i > "$SCREENSHOT_DIR/unauthenticated-FAIL-snapshot.txt" 2>/dev/null || true
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== [$FEATURE] Results: $PASS passed, $FAIL failed ==="
agent-browser close
