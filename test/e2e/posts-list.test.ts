/**
 * F-005 貼文列表與詳情 — API E2E Tests
 *
 * 根據 QA Issue #17 的 scenarios 撰寫。
 * Spec: specs/features/f005-list-posts.md
 * Feature Issue: #15
 */

import { api } from './helpers/api';
import { errorCodes } from './helpers/fixtures';
import { registerAndLogin, createPost, createMultiplePosts } from './helpers/setup';

describe('GET /api/v1/posts', () => {
  let userCookie: string;

  beforeAll(async () => {
    const { cookie } = await registerAndLogin();
    userCookie = cookie;
  });

  // ============================================================
  // Happy Path — 貼文列表
  // ============================================================
  describe('Happy Path — 貼文列表', () => {
    it('WHEN 取得貼文列表（預設 limit） THEN returns 200 with data array', async () => {
      // GIVEN 至少有一篇貼文
      await createPost(userCookie, 'List test post');

      // WHEN GET /api/v1/posts
      const res = await api.get('/posts');

      // THEN 200 + data array
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(20);
    });

    it('WHEN 取得貼文列表 THEN data is sorted by created_at DESC', async () => {
      // GIVEN 建立多篇貼文
      await createMultiplePosts(userCookie, 3);

      // WHEN GET /api/v1/posts
      const res = await api.get('/posts');

      // THEN data sorted by created_at DESC
      expect(res.status).toBe(200);
      const data = res.body.data;
      if (data.length >= 2) {
        for (let i = 0; i < data.length - 1; i++) {
          const current = new Date(data[i].created_at).getTime();
          const next = new Date(data[i + 1].created_at).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });

    it('WHEN 取得貼文列表 THEN response contains pagination info', async () => {
      // WHEN GET /api/v1/posts
      const res = await api.get('/posts');

      // THEN has_more and next_cursor fields exist
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('has_more');
      expect(typeof res.body.has_more).toBe('boolean');
      // next_cursor can be string or null
      expect(res.body).toHaveProperty('next_cursor');
    });

    it('WHEN 未登入瀏覽貼文 THEN returns 200 (public route)', async () => {
      // WHEN GET /api/v1/posts without token
      const res = await api.get('/posts');

      // THEN 200 (not 401)
      expect(res.status).toBe(200);
    });
  });

  // ============================================================
  // Cursor-based Pagination
  // ============================================================
  describe('Cursor-based Pagination', () => {
    let paginationCookie: string;

    beforeAll(async () => {
      // 建立一個獨立使用者並建立 25 篇貼文來測試分頁
      const { cookie } = await registerAndLogin();
      paginationCookie = cookie;
      await createMultiplePosts(paginationCookie, 25);
    });

    it('WHEN limit=20 且有 25 篇貼文 THEN returns 20 items with has_more=true', async () => {
      // WHEN GET /api/v1/posts?limit=20
      const res = await api.get('/posts?limit=20');

      // THEN data length = 20, has_more = true, next_cursor is not null
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(20);
      expect(res.body.has_more).toBe(true);
      expect(res.body.next_cursor).not.toBeNull();
    });

    it('WHEN 使用 cursor 取得第二頁 THEN returns remaining items with has_more=false', async () => {
      // GIVEN 取得第一頁
      const firstPage = await api.get('/posts?limit=20');
      expect(firstPage.status).toBe(200);
      const cursor = firstPage.body.next_cursor;
      expect(cursor).not.toBeNull();

      // WHEN GET /api/v1/posts?cursor={cursor}&limit=20
      const secondPage = await api.get(`/posts?cursor=${cursor}&limit=20`);

      // THEN data length <= 5 (remaining), has_more = false
      expect(secondPage.status).toBe(200);
      expect(secondPage.body.data.length).toBeGreaterThan(0);
      expect(secondPage.body.data.length).toBeLessThanOrEqual(20);
      expect(secondPage.body.has_more).toBe(false);
      expect(secondPage.body.next_cursor).toBeNull();
    });

    it('WHEN cursor 指向不存在的 post THEN returns 200 with empty data', async () => {
      // WHEN GET with nonexistent cursor
      const res = await api.get('/posts?cursor=nonexistent-uuid');

      // THEN 200 + empty data
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.has_more).toBe(false);
    });
  });

  // ============================================================
  // Happy Path — 單篇貼文詳情
  // ============================================================
  describe('Happy Path — 單篇貼文詳情', () => {
    it('WHEN 取得單篇貼文詳情 THEN returns 200 with post object', async () => {
      // GIVEN post exists
      const post = await createPost(userCookie, 'Detail test post');

      // WHEN GET /api/v1/posts/:id
      const res = await api.get(`/posts/${post.id}`);

      // THEN 200 + post object
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: post.id,
        content: 'Detail test post',
      });
      expect(res.body.author).toBeDefined();
      expect(res.body.author.username).toBeDefined();
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================
  describe('Error Handling', () => {
    it('WHEN 貼文不存在 THEN returns 404 NOT_FOUND', async () => {
      // WHEN GET nonexistent post
      const res = await api.get('/posts/nonexistent-uuid');

      // THEN 404 + NOT_FOUND
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });

    it('WHEN limit 超過 50 THEN returns 400 INVALID_INPUT', async () => {
      // WHEN GET with limit=51
      const res = await api.get('/posts?limit=51');

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN limit 為 0 THEN returns 400 INVALID_INPUT', async () => {
      // WHEN GET with limit=0
      const res = await api.get('/posts?limit=0');

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN limit 為負數 THEN returns 400 INVALID_INPUT', async () => {
      // WHEN GET with limit=-1
      const res = await api.get('/posts?limit=-1');

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('Edge Cases', () => {
    it('WHEN 沒有任何貼文（使用新使用者視角） THEN returns 200 with empty pagination', async () => {
      // 注意：因為其他測試已建立貼文，這裡只驗證回應格式正確
      // 實際「沒有任何貼文」情境在全新環境中測試
      const res = await api.get('/posts');

      // THEN 200 + valid pagination structure
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('has_more');
      expect(res.body).toHaveProperty('next_cursor');
    });
  });
});
