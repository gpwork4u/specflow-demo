/**
 * F-004 建立貼文 — API E2E Tests
 *
 * 根據 QA Issue #17 的 scenarios 撰寫。
 * Spec: specs/features/f004-create-post.md
 * Feature Issue: #14
 */

import { api } from './helpers/api';
import {
  validPostContent,
  invalidPostContent,
  errorCodes,
} from './helpers/fixtures';
import { registerAndLogin } from './helpers/setup';

describe('POST /api/v1/posts', () => {
  let userCookie: string;
  let userData: any;

  beforeAll(async () => {
    const { user, cookie } = await registerAndLogin();
    userCookie = cookie;
    userData = user;
  });

  // ============================================================
  // Happy Path
  // ============================================================
  describe('Happy Path', () => {
    it('WHEN 已登入使用者建立貼文 THEN returns 201 with post object', async () => {
      // GIVEN 使用者已登入
      // WHEN POST /api/v1/posts with valid content
      const res = await api.post('/posts', { content: validPostContent.simple }, { cookie: userCookie });

      // THEN 201 + post object
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        content: validPostContent.simple,
        likes_count: 0,
        comments_count: 0,
        created_at: expect.any(String),
      });
    });

    it('WHEN 建立貼文成功 THEN response contains author info', async () => {
      // GIVEN 使用者已登入
      // WHEN POST /api/v1/posts
      const res = await api.post('/posts', { content: 'Author check post' }, { cookie: userCookie });

      // THEN author object contains username
      expect(res.status).toBe(201);
      expect(res.body.author).toBeDefined();
      expect(res.body.author).toMatchObject({
        id: userData.id,
        username: userData.username,
      });
    });

    it('WHEN 建立含中文內容的貼文 THEN returns 201 with correct content', async () => {
      // GIVEN 使用者已登入
      // WHEN POST with 中文 content
      const res = await api.post('/posts', { content: validPostContent.chinese }, { cookie: userCookie });

      // THEN 201 + content preserved
      expect(res.status).toBe(201);
      expect(res.body.content).toBe(validPostContent.chinese);
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================
  describe('Error Handling', () => {
    it('WHEN 未登入建立貼文 THEN returns 401 UNAUTHORIZED', async () => {
      // WHEN POST without token
      const res = await api.post('/posts', { content: 'Hello' });

      // THEN 401 + UNAUTHORIZED
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(errorCodes.UNAUTHORIZED);
    });

    it('WHEN content 為空字串 THEN returns 400 INVALID_INPUT', async () => {
      // GIVEN 使用者已登入
      // WHEN POST with empty content
      const res = await api.post('/posts', { content: invalidPostContent.empty }, { cookie: userCookie });

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN content 僅含空白 THEN returns 400 INVALID_INPUT', async () => {
      // GIVEN 使用者已登入
      // WHEN POST with whitespace-only content
      const res = await api.post('/posts', { content: invalidPostContent.whitespaceOnly }, { cookie: userCookie });

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN content 超過 2000 字 THEN returns 400 INVALID_INPUT', async () => {
      // GIVEN 使用者已登入
      // WHEN POST with content > 2000 chars
      const res = await api.post('/posts', { content: invalidPostContent.tooLong }, { cookie: userCookie });

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN 缺少 content 欄位 THEN returns 400 INVALID_INPUT', async () => {
      // GIVEN 使用者已登入
      // WHEN POST with empty body
      const res = await api.post('/posts', {}, { cookie: userCookie });

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('Edge Cases', () => {
    it('WHEN content 恰好 2000 字 THEN returns 201', async () => {
      // GIVEN 使用者已登入
      // WHEN POST with exactly 2000 chars
      const res = await api.post('/posts', { content: validPostContent.exactMax }, { cookie: userCookie });

      // THEN 201
      expect(res.status).toBe(201);
      expect(res.body.content).toBe(validPostContent.exactMax);
    });

    it('WHEN content 恰好 1 字 THEN returns 201', async () => {
      // GIVEN 使用者已登入
      // WHEN POST with single char
      const res = await api.post('/posts', { content: validPostContent.singleChar }, { cookie: userCookie });

      // THEN 201
      expect(res.status).toBe(201);
      expect(res.body.content).toBe(validPostContent.singleChar);
    });
  });
});
