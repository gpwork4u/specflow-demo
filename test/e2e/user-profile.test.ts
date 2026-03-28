/**
 * F-009 使用者個人頁面 — API E2E Tests
 *
 * 根據 QA Issue #26 的 scenarios 撰寫。
 * Spec: specs/features/f009-user-profile.md
 * Feature Issue: #25
 */

import { api } from './helpers/api';
import { errorCodes } from './helpers/fixtures';
import { registerAndLogin, createPost, createMultiplePosts } from './helpers/setup';

describe('GET /api/v1/users/:id', () => {
  let userCookie: string;
  let userData: any;

  beforeAll(async () => {
    const u = await registerAndLogin();
    userCookie = u.cookie;
    userData = u.user;
  });

  // ============================================================
  // Happy Path — 使用者資訊
  // ============================================================
  describe('Happy Path — 使用者資訊', () => {
    it('WHEN 查看使用者個人資訊 THEN returns 200 with profile data', async () => {
      // GIVEN user exists
      // WHEN GET /api/v1/users/:id
      const res = await api.get(`/users/${userData.id}`);

      // THEN 200 + username + display_name
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: userData.id,
        username: expect.any(String),
        display_name: expect.any(String),
      });
      expect(res.body).toHaveProperty('posts_count');
    });

    it('WHEN 查看使用者資訊 THEN response 不含 email 和 password_hash', async () => {
      // WHEN GET
      const res = await api.get(`/users/${userData.id}`);

      // THEN no sensitive fields
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('password_hash');
      expect(res.body).not.toHaveProperty('password');
    });

    it('WHEN 未登入查看使用者頁面 THEN returns 200 (public route)', async () => {
      // WHEN GET without token
      const res = await api.get(`/users/${userData.id}`);

      // THEN 200
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userData.id);
    });

    it('WHEN 使用者有貼文 THEN posts_count 反映實際數量', async () => {
      // GIVEN user with posts
      const u = await registerAndLogin();
      await createMultiplePosts(u.cookie, 5);

      // WHEN GET
      const res = await api.get(`/users/${u.user.id}`);

      // THEN posts_count = 5
      expect(res.status).toBe(200);
      expect(res.body.posts_count).toBe(5);
    });
  });

  // ============================================================
  // Happy Path — 使用者貼文列表
  // ============================================================
  describe('Happy Path — 使用者貼文列表', () => {
    it('WHEN 取得使用者的貼文列表 THEN returns 200 with data sorted by created_at DESC', async () => {
      // GIVEN user with 5 posts
      const u = await registerAndLogin();
      await createMultiplePosts(u.cookie, 5);

      // WHEN GET /api/v1/users/:id/posts
      const res = await api.get(`/users/${u.user.id}/posts`);

      // THEN 200 + data array + all author.id matches
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(5);

      // All posts belong to user
      for (const post of res.body.data) {
        expect(post.author.id).toBe(u.user.id);
      }

      // Sorted by created_at DESC
      const data = res.body.data;
      for (let i = 0; i < data.length - 1; i++) {
        const current = new Date(data[i].created_at).getTime();
        const next = new Date(data[i + 1].created_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('WHEN 未登入取得使用者貼文列表 THEN returns 200 (public route)', async () => {
      // WHEN GET without token
      const res = await api.get(`/users/${userData.id}/posts`);

      // THEN 200
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================
  describe('Error Handling', () => {
    it('WHEN 查看不存在的使用者 THEN returns 404 NOT_FOUND', async () => {
      // WHEN GET /api/v1/users/nonexistent
      const res = await api.get('/users/nonexistent');

      // THEN 404
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });

    it('WHEN 查看不存在使用者的貼文 THEN returns 404 NOT_FOUND', async () => {
      // WHEN GET /api/v1/users/nonexistent/posts
      const res = await api.get('/users/nonexistent/posts');

      // THEN 404
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('Edge Cases', () => {
    it('WHEN 使用者沒有貼文 THEN returns 200 with empty data', async () => {
      // GIVEN user with 0 posts
      const u = await registerAndLogin();

      // WHEN GET /api/v1/users/:id/posts
      const res = await api.get(`/users/${u.user.id}/posts`);

      // THEN 200 + data = []
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('WHEN bio 為 null 的使用者 THEN returns 200 with bio=null', async () => {
      // GIVEN user without bio (default)
      const u = await registerAndLogin();

      // WHEN GET
      const res = await api.get(`/users/${u.user.id}`);

      // THEN bio is null
      expect(res.status).toBe(200);
      expect(res.body.bio).toBeNull();
    });

    it('WHEN posts_count 不含已刪除的貼文 THEN count excludes soft-deleted posts', async () => {
      // GIVEN user with 3 posts, 1 deleted
      const u = await registerAndLogin();
      const posts = await createMultiplePosts(u.cookie, 3);
      await api.delete(`/posts/${posts[0].id}`, { cookie: u.cookie });

      // WHEN GET user profile
      const res = await api.get(`/users/${u.user.id}`);

      // THEN posts_count = 2 (excludes deleted)
      expect(res.status).toBe(200);
      expect(res.body.posts_count).toBe(2);
    });

    it('WHEN 使用者貼文列表 THEN 不顯示已刪除的貼文', async () => {
      // GIVEN user with 3 posts, 1 deleted
      const u = await registerAndLogin();
      const posts = await createMultiplePosts(u.cookie, 3);
      await api.delete(`/posts/${posts[0].id}`, { cookie: u.cookie });

      // WHEN GET /api/v1/users/:id/posts
      const res = await api.get(`/users/${u.user.id}/posts`);

      // THEN only 2 posts returned
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);

      // None of the returned posts should be the deleted one
      const returnedIds = res.body.data.map((p: any) => p.id);
      expect(returnedIds).not.toContain(posts[0].id);
    });
  });
});
