/**
 * F-007 按讚與取消按讚 — API E2E Tests
 *
 * 根據 QA Issue #26 的 scenarios 撰寫。
 * Spec: specs/features/f007-likes.md
 * Feature Issue: #23
 */

import { api } from './helpers/api';
import { errorCodes } from './helpers/fixtures';
import { registerAndLogin, createPost } from './helpers/setup';

describe('POST/DELETE /api/v1/posts/:id/likes', () => {
  let user1Cookie: string;
  let user1Data: any;
  let user2Cookie: string;

  beforeAll(async () => {
    const u1 = await registerAndLogin();
    user1Cookie = u1.cookie;
    user1Data = u1.user;

    const u2 = await registerAndLogin();
    user2Cookie = u2.cookie;
  });

  // ============================================================
  // Happy Path
  // ============================================================
  describe('Happy Path', () => {
    it('WHEN 已登入使用者按讚貼文 THEN returns 201 with updated likes_count and is_liked=true', async () => {
      // GIVEN post exists
      const post = await createPost(user2Cookie, '按讚測試貼文');

      // WHEN POST /api/v1/posts/:id/likes
      const res = await api.post(`/posts/${post.id}/likes`, {}, { cookie: user1Cookie });

      // THEN 201 + likes_count increased + is_liked = true
      expect(res.status).toBe(201);
      expect(res.body.likes_count).toBeGreaterThanOrEqual(1);
      expect(res.body.is_liked).toBe(true);
    });

    it('WHEN 已按讚使用者取消按讚 THEN returns 200 with updated likes_count and is_liked=false', async () => {
      // GIVEN user1 has liked a post
      const post = await createPost(user2Cookie, '取消按讚測試');
      await api.post(`/posts/${post.id}/likes`, {}, { cookie: user1Cookie });

      // WHEN DELETE /api/v1/posts/:id/likes
      const res = await api.delete(`/posts/${post.id}/likes`, { cookie: user1Cookie });

      // THEN 200 + is_liked = false
      expect(res.status).toBe(200);
      expect(res.body.is_liked).toBe(false);
    });

    it('WHEN 使用者對自己的貼文按讚 THEN returns 201', async () => {
      // GIVEN user1 owns a post
      const post = await createPost(user1Cookie, '自己的貼文按讚');

      // WHEN POST /api/v1/posts/:id/likes
      const res = await api.post(`/posts/${post.id}/likes`, {}, { cookie: user1Cookie });

      // THEN 201
      expect(res.status).toBe(201);
      expect(res.body.is_liked).toBe(true);
    });

    it('WHEN 使用者已按讚 THEN GET 貼文詳情 is_liked=true', async () => {
      // GIVEN user1 has liked a post
      const post = await createPost(user2Cookie, '按讚後查詢測試');
      await api.post(`/posts/${post.id}/likes`, {}, { cookie: user1Cookie });

      // WHEN GET /api/v1/posts/:id with user's token
      const res = await api.get(`/posts/${post.id}`, { cookie: user1Cookie });

      // THEN is_liked = true
      expect(res.status).toBe(200);
      expect(res.body.is_liked).toBe(true);
    });

    it('WHEN 按讚後 likes_count 正確累加 THEN count reflects actual likes', async () => {
      // GIVEN post exists with 0 likes
      const post = await createPost(user1Cookie, '計數測試');

      // WHEN user2 likes it
      const likeRes = await api.post(`/posts/${post.id}/likes`, {}, { cookie: user2Cookie });

      // THEN likes_count >= 1
      expect(likeRes.status).toBe(201);
      expect(likeRes.body.likes_count).toBeGreaterThanOrEqual(1);
    });

    it('WHEN 取消按讚後 likes_count 正確遞減 THEN count reflects actual likes', async () => {
      // GIVEN user1 has liked a post
      const post = await createPost(user2Cookie, '遞減計數測試');
      const likeRes = await api.post(`/posts/${post.id}/likes`, {}, { cookie: user1Cookie });
      const countAfterLike = likeRes.body.likes_count;

      // WHEN DELETE
      const unlikeRes = await api.delete(`/posts/${post.id}/likes`, { cookie: user1Cookie });

      // THEN likes_count decreased by 1
      expect(unlikeRes.status).toBe(200);
      expect(unlikeRes.body.likes_count).toBe(countAfterLike - 1);
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================
  describe('Error Handling', () => {
    it('WHEN 重複按讚 THEN returns 409 ALREADY_LIKED', async () => {
      // GIVEN user already liked post
      const post = await createPost(user2Cookie, '重複按讚測試');
      await api.post(`/posts/${post.id}/likes`, {}, { cookie: user1Cookie });

      // WHEN POST again
      const res = await api.post(`/posts/${post.id}/likes`, {}, { cookie: user1Cookie });

      // THEN 409 + ALREADY_LIKED
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ALREADY_LIKED');
    });

    it('WHEN 取消未按過的讚 THEN returns 409 NOT_LIKED', async () => {
      // GIVEN user has NOT liked post
      const post = await createPost(user2Cookie, '取消未按讚測試');

      // WHEN DELETE
      const res = await api.delete(`/posts/${post.id}/likes`, { cookie: user1Cookie });

      // THEN 409 + NOT_LIKED
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('NOT_LIKED');
    });

    it('WHEN 對不存在的貼文按讚 THEN returns 404 NOT_FOUND', async () => {
      // WHEN POST /api/v1/posts/nonexistent/likes
      const res = await api.post('/posts/nonexistent/likes', {}, { cookie: user1Cookie });

      // THEN 404 + NOT_FOUND
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });

    it('WHEN 對已刪除的貼文按讚 THEN returns 404 NOT_FOUND', async () => {
      // GIVEN post has been soft deleted
      const post = await createPost(user1Cookie, '已刪除貼文按讚');
      await api.delete(`/posts/${post.id}`, { cookie: user1Cookie });

      // WHEN POST likes
      const res = await api.post(`/posts/${post.id}/likes`, {}, { cookie: user2Cookie });

      // THEN 404 + NOT_FOUND
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });

    it('WHEN 未登入按讚 THEN returns 401 UNAUTHORIZED', async () => {
      // GIVEN post exists
      const post = await createPost(user1Cookie, '未登入按讚測試');

      // WHEN POST without token
      const res = await api.post(`/posts/${post.id}/likes`, {});

      // THEN 401 + UNAUTHORIZED
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(errorCodes.UNAUTHORIZED);
    });

    it('WHEN 未登入取消按讚 THEN returns 401 UNAUTHORIZED', async () => {
      // GIVEN post exists
      const post = await createPost(user1Cookie, '未登入取消按讚測試');

      // WHEN DELETE without token
      const res = await api.delete(`/posts/${post.id}/likes`);

      // THEN 401 + UNAUTHORIZED
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(errorCodes.UNAUTHORIZED);
    });
  });
});
