/**
 * Test Environment Setup / Teardown
 *
 * 提供測試前後的環境準備和清理邏輯。
 */

import { api, extractTokenCookie } from './api';
import { uniqueRegistration, uniquePostContent } from './fixtures';

/**
 * 註冊一個新使用者並回傳 user 資訊和 token cookie
 * 用於需要「已登入使用者」的測試 scenario (GIVEN)
 */
export async function registerAndLogin(overrides?: Partial<{
  email: string;
  username: string;
  password: string;
  display_name: string;
}>): Promise<{
  user: any;
  cookie: string;
  credentials: { email: string; password: string };
}> {
  const data = { ...uniqueRegistration(), ...overrides };

  const res = await api.post('/auth/register', data);

  if (res.status !== 201) {
    throw new Error(
      `Setup failed: register returned ${res.status} — ${JSON.stringify(res.body)}`
    );
  }

  const tokenCookie = extractTokenCookie(res.setCookie || []);
  if (!tokenCookie) {
    throw new Error('Setup failed: no token cookie in register response');
  }

  return {
    user: res.body,
    cookie: tokenCookie,
    credentials: { email: data.email, password: data.password },
  };
}

/**
 * 僅登入（使用已存在的帳號）
 */
export async function login(email: string, password: string): Promise<{
  user: any;
  cookie: string;
}> {
  const res = await api.post('/auth/login', { email, password });

  if (res.status !== 200) {
    throw new Error(
      `Setup failed: login returned ${res.status} — ${JSON.stringify(res.body)}`
    );
  }

  const tokenCookie = extractTokenCookie(res.setCookie || []);
  if (!tokenCookie) {
    throw new Error('Setup failed: no token cookie in login response');
  }

  return {
    user: res.body,
    cookie: tokenCookie,
  };
}

// ============================================================
// Post Helpers (Sprint 2)
// ============================================================

/**
 * 建立一篇貼文並回傳 post 物件
 * 用於需要「已存在貼文」的測試 scenario (GIVEN)
 */
export async function createPost(
  cookie: string,
  content?: string
): Promise<any> {
  const postContent = content || uniquePostContent();

  const res = await api.post('/posts', { content: postContent }, { cookie });

  if (res.status !== 201) {
    throw new Error(
      `Setup failed: create post returned ${res.status} — ${JSON.stringify(res.body)}`
    );
  }

  return res.body;
}

/**
 * 建立多篇貼文（用於分頁測試）
 * 回傳所有建立的 post 物件（按建立順序）
 */
export async function createMultiplePosts(
  cookie: string,
  count: number
): Promise<any[]> {
  const posts: any[] = [];
  for (let i = 0; i < count; i++) {
    const post = await createPost(cookie, `Test post #${i + 1} - ${Date.now()}`);
    posts.push(post);
  }
  return posts;
}

/**
 * 產生一個看起來像 JWT 但簽名無效的 token
 */
export function createTamperedToken(): string {
  // 建立一個 base64 編碼的假 JWT
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: '123', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const fakeSignature = 'invalid-signature-tampered';
  return `token=${header}.${payload}.${fakeSignature}`;
}

/**
 * 產生一個過期的 JWT token（用於測試 token 過期 scenario）
 */
export function createExpiredToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: '123',
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 小時前過期
  })).toString('base64url');
  const fakeSignature = 'expired-token-signature';
  return `token=${header}.${payload}.${fakeSignature}`;
}
