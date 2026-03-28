/**
 * Test Fixtures
 *
 * 提供測試用的假資料，根據 QA Issue #8 的 scenarios 設計。
 */

/** 有效的註冊資料 */
export const validRegistration = {
  email: 'testuser@example.com',
  username: 'testuser',
  password: 'MyPass123',
  display_name: 'Test User',
};

/** 產生唯一的註冊資料（避免測試之間衝突） */
export function uniqueRegistration(suffix?: string): {
  email: string;
  username: string;
  password: string;
  display_name: string;
} {
  const id = suffix || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    email: `test-${id}@example.com`,
    username: `user${id}`.slice(0, 30), // 確保不超過 30 字元
    password: 'MyPass123',
    display_name: `Test User ${id}`,
  };
}

/** 有效的登入資料 */
export const validLogin = {
  email: 'testuser@example.com',
  password: 'MyPass123',
};

/** 無效的 email 格式 */
export const invalidEmails = [
  'not-an-email',
  'missing@',
  '@missing.com',
  'spaces in@email.com',
  '',
];

/** 無效的 username */
export const invalidUsernames = {
  tooShort: 'ab',                          // < 3 chars
  tooLong: 'a'.repeat(31),                 // > 30 chars
  specialChars: 'user name!',              // 含空格和特殊字元
  exactMin: 'abc',                         // 恰好 3 chars（有效）
  exactMax: 'a'.repeat(30),                // 恰好 30 chars（有效）
};

/** 無效的密碼 */
export const invalidPasswords = {
  tooShort: 'Ab1',                         // < 8 chars
  noUppercase: 'mypass123',                // 無大寫
  exactMin: 'MyPass12',                    // 恰好 8 chars（有效）
};

/** 錯誤回應的預期格式 */
export const errorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
};
