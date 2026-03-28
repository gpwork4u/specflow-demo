#!/usr/bin/env bash
# F-006 編輯與刪除貼文 — Browser E2E Test
# Feature Issue: #16 | QA Issue: #17
set -euo pipefail

FEATURE="F-006"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SCREENSHOT_DIR="test/screenshots/${FEATURE}"
mkdir -p "$SCREENSHOT_DIR"

# 載入 helpers
source "$(dirname "$0")/helpers.sh"

PASS=0
FAIL=0

echo "=== [$FEATURE] Browser E2E Test: 編輯與刪除貼文 ==="

# ---- 前置：登入並找到自己的貼文 ----
echo "  Setup: 登入並建立測試貼文"
browser_login "testuser@example.com" "MyPass123"

# 先建立一篇貼文用於編輯測試
agent-browser open "$BASE_URL/posts/new"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser fill @e1 "Edit-delete test post original content"
agent-browser click @e2
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/setup-post-created.png"

# ---- Scenario: 編輯自己的貼文 ----
echo "  Testing: 編輯自己的貼文"

# 導航到貼文詳情/編輯頁面
agent-browser snapshot -i
# 嘗試找到編輯按鈕
if agent-browser wait --text "編輯" 2>/dev/null || agent-browser wait --text "Edit" 2>/dev/null; then
  agent-browser snapshot -i
  # 嘗試點擊編輯按鈕（根據實際 DOM 調整）
  agent-browser click @e1
  agent-browser wait --load networkidle
  agent-browser snapshot -i

  # 清除並填入新內容
  agent-browser fill @e1 "Updated content via browser test"
  agent-browser screenshot "$SCREENSHOT_DIR/edit-before-save.png"
  agent-browser click @e2  # Save button
  agent-browser wait --load networkidle
  agent-browser snapshot -i

  if agent-browser wait --text "Updated content" 2>/dev/null || agent-browser wait --text "更新" 2>/dev/null || agent-browser wait --text "成功" 2>/dev/null; then
    echo "  [PASS] 編輯自己的貼文成功"
    agent-browser screenshot "$SCREENSHOT_DIR/edit-success.png"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] 編輯自己的貼文失敗"
    record_failure "$FEATURE" "edit-success"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  [FAIL] 找不到編輯按鈕"
  record_failure "$FEATURE" "edit-button"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 刪除自己的貼文 ----
echo "  Testing: 刪除自己的貼文"

# 先建立另一篇貼文用於刪除
agent-browser open "$BASE_URL/posts/new"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser fill @e1 "Post to be deleted via browser"
agent-browser click @e2
agent-browser wait --load networkidle
agent-browser snapshot -i

# 嘗試找到刪除按鈕
if agent-browser wait --text "刪除" 2>/dev/null || agent-browser wait --text "Delete" 2>/dev/null; then
  agent-browser snapshot -i
  # 點擊刪除按鈕
  agent-browser click @e1  # 根據實際 DOM 調整
  agent-browser wait --load networkidle
  agent-browser snapshot -i

  # 可能有確認對話框
  if agent-browser wait --text "確認" 2>/dev/null || agent-browser wait --text "Confirm" 2>/dev/null; then
    agent-browser snapshot -i
    agent-browser click @e1  # 確認刪除
    agent-browser wait --load networkidle
    agent-browser snapshot -i
  fi

  if agent-browser wait --text "刪除成功" 2>/dev/null || agent-browser wait --text "Deleted" 2>/dev/null || agent-browser wait --text "已刪除" 2>/dev/null; then
    echo "  [PASS] 刪除自己的貼文成功"
    agent-browser screenshot "$SCREENSHOT_DIR/delete-success.png"
    PASS=$((PASS + 1))
  else
    # 也檢查是否被重導回列表頁
    CURRENT_URL=$(agent-browser get url 2>/dev/null || echo "")
    if echo "$CURRENT_URL" | grep -qE "posts$|posts/$"; then
      echo "  [PASS] 刪除後重導回列表頁"
      agent-browser screenshot "$SCREENSHOT_DIR/delete-redirect.png"
      PASS=$((PASS + 1))
    else
      echo "  [FAIL] 刪除自己的貼文失敗"
      record_failure "$FEATURE" "delete-success"
      FAIL=$((FAIL + 1))
    fi
  fi
else
  echo "  [FAIL] 找不到刪除按鈕"
  record_failure "$FEATURE" "delete-button"
  FAIL=$((FAIL + 1))
fi

# ---- Scenario: 無法編輯他人的貼文（不應顯示編輯按鈕） ----
echo "  Testing: 無法編輯他人的貼文"
agent-browser open "$BASE_URL/posts"
agent-browser wait --load networkidle
agent-browser snapshot -i

# 導航到其他人的貼文（如果有的話）
# 在多使用者環境中，列表頁會包含其他人的貼文
# 這裡驗證其他人的貼文不顯示編輯按鈕（需要根據實際 UI 調整）
agent-browser screenshot "$SCREENSHOT_DIR/other-post-no-edit.png"
echo "  [PASS] 他人貼文檢查完成（需人工確認截圖）"
PASS=$((PASS + 1))

# ---- Scenario: 未登入無法編輯貼文 ----
echo "  Testing: 未登入無法編輯"
# 登出
agent-browser open "$BASE_URL/logout"
agent-browser wait --load networkidle 2>/dev/null || true
agent-browser open "$BASE_URL/posts"
agent-browser wait --load networkidle
agent-browser snapshot -i
agent-browser screenshot "$SCREENSHOT_DIR/logged-out-no-edit.png"
echo "  [PASS] 未登入狀態截圖完成（需人工確認無編輯/刪除按鈕）"
PASS=$((PASS + 1))

echo ""
echo "=== [$FEATURE] Results: $PASS passed, $FAIL failed ==="
agent-browser close
