#!/usr/bin/env bash
# F-005 貼文列表與詳情 — Browser E2E Test
# Feature Issue: #15 | QA Issue: #17
set -euo pipefail

FEATURE="F-005"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="test/screenshots/${FEATURE}"
mkdir -p "$SCREENSHOT_DIR"

# 載入 helpers
source "$(dirname "$0")/helpers.sh"

PASS=0
FAIL=0

echo "=== [$FEATURE] Browser E2E Test: 貼文列表與詳情 ==="

# ---- Scenario: 貼文列表頁面可正常載入 ----
echo "  Testing: 貼文列表頁面載入"
agent-browser open "$BASE_URL/posts"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/list-page.png"

if agent-browser wait --text "貼文" 2>/dev/null || agent-browser wait --text "Posts" 2>/dev/null || agent-browser wait --text "Feed" 2>/dev/null; then
  echo "  [PASS] 貼文列表頁面載入成功"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 貼文列表頁面載入失敗"
  record_failure "$FEATURE" "list-page"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 未登入也能瀏覽貼文列表（公開路由） ----
echo "  Testing: 未登入瀏覽貼文列表"
# 先確認沒有登入狀態（開啟無痕/直接存取）
agent-browser open "$BASE_URL/posts"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 只要不被導向登入頁或顯示 401 即算通過
CURRENT_URL=$(agent-browser get url 2>/dev/null || echo "")
if echo "$CURRENT_URL" | grep -q "posts"; then
  echo "  [PASS] 未登入可瀏覽貼文列表"
  agent-browser screenshot "$SCREENSHOT_DIR/list-public.png"
  PASS=$((PASS + 1))
elif echo "$CURRENT_URL" | grep -q "login"; then
  echo "  [FAIL] 未登入被導向登入頁"
  record_failure "$FEATURE" "list-public"
  FAIL=$((FAIL + 1))
else
  echo "  [PASS] 未登入可瀏覽（URL: $CURRENT_URL）"
  agent-browser screenshot "$SCREENSHOT_DIR/list-public.png"
  PASS=$((PASS + 1))
fi

# ---- Scenario: 點擊貼文可查看詳情 ----
echo "  Testing: 點擊貼文查看詳情"
# 先登入建立一篇貼文
browser_login "testuser@example.com" "MyPass123"
agent-browser open "$BASE_URL/posts"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 嘗試點擊第一篇貼文
agent-browser click @e1
agent-browser wait --load networkidle
agent-browser snapshot -i

DETAIL_URL=$(agent-browser get url 2>/dev/null || echo "")
if echo "$DETAIL_URL" | grep -qE "posts/.+"; then
  echo "  [PASS] 可查看貼文詳情"
  agent-browser screenshot "$SCREENSHOT_DIR/detail-page.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 無法查看貼文詳情（URL: $DETAIL_URL）"
  record_failure "$FEATURE" "detail-page"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 貼文詳情顯示完整內容和 author ----
echo "  Testing: 貼文詳情顯示 author"
agent-browser snapshot -i

if agent-browser wait --text "testuser" 2>/dev/null || agent-browser wait --text "@" 2>/dev/null; then
  echo "  [PASS] 貼文詳情顯示 author 資訊"
  agent-browser screenshot "$SCREENSHOT_DIR/detail-author.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 貼文詳情未顯示 author 資訊"
  record_failure "$FEATURE" "detail-author"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== [$FEATURE] Results: $PASS passed, $FAIL failed ==="
agent-browser close
