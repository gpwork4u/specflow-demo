#!/usr/bin/env bash
# F-008 留言功能 — Browser E2E Test
# Feature Issue: #24 | QA Issue: #26
set -euo pipefail

FEATURE="F-008"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="test/screenshots/${FEATURE}"
mkdir -p "$SCREENSHOT_DIR"

# 載入 helpers
source "$(dirname "$0")/helpers.sh"

PASS=0
FAIL=0

echo "=== [$FEATURE] Browser E2E Test: 留言功能 ==="

# ---- 前置：登入 ----
echo "  Setup: 登入測試帳號"
browser_login "testuser@example.com" "MyPass123"

# ---- Scenario: 進入貼文詳情頁可看到留言區 ----
echo "  Testing: 貼文詳情頁顯示留言區"
agent-browser open "$BASE_URL/posts"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 點擊第一篇貼文進入詳情
agent-browser click @e1
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/post-detail-comments.png"

if agent-browser wait --text "comment" 2>/dev/null || agent-browser wait --text "Comment" 2>/dev/null || agent-browser wait --text "留言" 2>/dev/null; then
  echo "  [PASS] 貼文詳情頁有留言區"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 貼文詳情頁缺少留言區"
  record_failure "$FEATURE" "comment-section"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 新增留言成功 ----
echo "  Testing: 新增留言"
agent-browser snapshot -i

# 找到留言輸入框並填入（根據實際 DOM snapshot 調整 @ref）
agent-browser fill @e1 "This is a browser test comment!"
agent-browser screenshot "$SCREENSHOT_DIR/comment-before-submit.png"
agent-browser click @e2  # Submit comment button
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "browser test comment" 2>/dev/null; then
  echo "  [PASS] 新增留言成功，留言內容顯示在頁面"
  agent-browser screenshot "$SCREENSHOT_DIR/comment-success.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 新增留言失敗或留言未顯示"
  record_failure "$FEATURE" "comment-submit"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 留言顯示作者資訊 ----
echo "  Testing: 留言顯示作者資訊"
agent-browser snapshot -i

if agent-browser wait --text "testuser" 2>/dev/null; then
  echo "  [PASS] 留言顯示作者名稱"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 留言未顯示作者名稱"
  record_failure "$FEATURE" "comment-author"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 空內容留言顯示錯誤 ----
echo "  Testing: 空內容留言"
agent-browser snapshot -i

# 不填內容直接按送出
agent-browser click @e2  # Submit without content
agent-browser wait --load networkidle
agent-browser snapshot -i

if agent-browser wait --text "required" 2>/dev/null || agent-browser wait --text "必填" 2>/dev/null || agent-browser wait --text "不能為空" 2>/dev/null; then
  echo "  [PASS] 空內容顯示驗證錯誤"
  agent-browser screenshot "$SCREENSHOT_DIR/comment-empty-error.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 空內容未顯示驗證錯誤"
  record_failure "$FEATURE" "comment-empty"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 刪除自己的留言 ----
echo "  Testing: 刪除自己的留言"
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/comment-before-delete.png"

# 找到刪除按鈕（根據實際 DOM snapshot 調整 @ref）
agent-browser click @e1  # Delete button for own comment
agent-browser wait --load networkidle
agent-browser snapshot -i

if ! agent-browser wait --text "browser test comment" 2>/dev/null; then
  echo "  [PASS] 刪除留言成功，留言已從頁面移除"
  agent-browser screenshot "$SCREENSHOT_DIR/comment-deleted.png"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] 刪除留言失敗，留言仍顯示"
  record_failure "$FEATURE" "comment-delete"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== [$FEATURE] Results: $PASS passed, $FAIL failed ==="
agent-browser close
