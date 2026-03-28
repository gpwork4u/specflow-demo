/**
 * F-006 編輯與刪除貼文 — API E2E Tests
 *
 * 根據 QA Issue #17 的 scenarios 撰寫。
 * Spec: specs/features/f006-edit-delete-post.md
 * Feature Issue: #16
 */

import { api } from './helpers/api';
import {
  errorCodes,
  updatedPostContent,
} from './helpers/fixtures';
import { registerAndLogin, createPost } from './helpers/setup';

describe('PATCH/DELETE /api/v1/posts/:id', () => {
  // 兩位使用者：owner 和 other
  let ownerCookie: string;
  let ownerUser: any;
  let otherCookie: string;

  beforeAll(async () => {
    const owner = await registerAndLogin();
    ownerCookie = owner.cookie;
    ownerUser = owner.user;

    const other = await registerAndLogin();
    otherCookie = other.cookie;
  });

  // ============================================================
  // Happy Path — 編輯貼文
  // ============================================================
  describe('Happy Path — 編輯貼文', () => {
    it('WHEN 編輯自己的貼文 THEN returns 200 with updated content', async () => {
      // GIVEN 使用者擁有一篇貼文
      const post = await createPost(ownerCookie, '原始內容');

      // WHEN PATCH /api/v1/posts/:id with new content
      const res = await api.patch(`/posts/${post.id}`, { content: updatedPostContent }, { cookie: ownerCookie });

      // THEN 200 + updated content
      expect(res.status).toBe(200);
      expect(res.body.content).toBe(updatedPostContent);
    });

    it('WHEN 編輯貼文成功 THEN updated_at > created_at', async () => {
      // GIVEN
      const post = await createPost(ownerCookie, '時間戳測試');

      // WHEN PATCH
      const res = await api.patch(`/posts/${post.id}`, { content: 'Updated timestamp' }, { cookie: ownerCookie });

      // THEN updated_at > created_at
      expect(res.status).toBe(200);
      const createdAt = new Date(res.body.created_at).getTime();
      const updatedAt = new Date(res.body.updated_at).getTime();
      expect(updatedAt).toBeGreaterThanOrEqual(createdAt);
    });
  });

  // ============================================================
  // Happy Path — 刪除貼文
  // ============================================================
  describe('Happy Path — 刪除貼文', () => {
    it('WHEN 刪除自己的貼文 THEN returns 200 or 204', async () => {
      // GIVEN 使用者擁有一篇貼文
      const post = await createPost(ownerCookie, '要刪除的貼文');

      // WHEN DELETE /api/v1/posts/:id
      const res = await api.delete(`/posts/${post.id}`, { cookie: ownerCookie });

      // THEN 200 or 204
      expect([200, 204]).toContain(res.status);
    });

    it('WHEN 刪除貼文後 THEN GET 該貼文 returns 404', async () => {
      // GIVEN 使用者擁有一篇貼文
      const post = await createPost(ownerCookie, '刪除後查詢測試');

      // WHEN DELETE
      const deleteRes = await api.delete(`/posts/${post.id}`, { cookie: ownerCookie });
      expect([200, 204]).toContain(deleteRes.status);

      // THEN GET returns 404
      const getRes = await api.get(`/posts/${post.id}`);
      expect(getRes.status).toBe(404);
      expect(getRes.body.code).toBe(errorCodes.NOT_FOUND);
    });
  });

  // ============================================================
  // Error Handling — 權限
  // ============================================================
  describe('Error Handling — 權限', () => {
    it('WHEN 編輯他人的貼文 THEN returns 403 FORBIDDEN', async () => {
      // GIVEN owner 擁有一篇貼文
      const post = await createPost(ownerCookie, '他人的貼文');

      // WHEN other user 嘗試編輯
      const res = await api.patch(`/posts/${post.id}`, { content: '惡意修改' }, { cookie: otherCookie });

      // THEN 403 + FORBIDDEN
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(errorCodes.FORBIDDEN);
    });

    it('WHEN 刪除他人的貼文 THEN returns 403 FORBIDDEN', async () => {
      // GIVEN owner 擁有一篇貼文
      const post = await createPost(ownerCookie, '不能刪除的貼文');

      // WHEN other user 嘗試刪除
      const res = await api.delete(`/posts/${post.id}`, { cookie: otherCookie });

      // THEN 403 + FORBIDDEN
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(errorCodes.FORBIDDEN);
    });
  });

  // ============================================================
  // Error Handling — 不存在的貼文
  // ============================================================
  describe('Error Handling — 不存在的貼文', () => {
    it('WHEN 編輯不存在的貼文 THEN returns 404 NOT_FOUND', async () => {
      // WHEN PATCH nonexistent post
      const res = await api.patch('/posts/nonexistent', { content: 'test' }, { cookie: ownerCookie });

      // THEN 404 + NOT_FOUND
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });

    it('WHEN 刪除不存在的貼文 THEN returns 404 NOT_FOUND', async () => {
      // WHEN DELETE nonexistent post
      const res = await api.delete('/posts/nonexistent', { cookie: ownerCookie });

      // THEN 404 + NOT_FOUND
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });
  });

  // ============================================================
  // Error Handling — 已刪除的貼文
  // ============================================================
  describe('Error Handling — 已刪除的貼文', () => {
    it('WHEN 編輯已刪除的貼文 THEN returns 404 NOT_FOUND', async () => {
      // GIVEN 建立並刪除貼文
      const post = await createPost(ownerCookie, '將被刪除再編輯');
      await api.delete(`/posts/${post.id}`, { cookie: ownerCookie });

      // WHEN PATCH 已刪除的貼文
      const res = await api.patch(`/posts/${post.id}`, { content: 'test' }, { cookie: ownerCookie });

      // THEN 404 + NOT_FOUND
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });

    it('WHEN 刪除已刪除的貼文（冪等） THEN returns 404 NOT_FOUND', async () => {
      // GIVEN 建立並刪除貼文
      const post = await createPost(ownerCookie, '將被重複刪除');
      await api.delete(`/posts/${post.id}`, { cookie: ownerCookie });

      // WHEN 再次 DELETE
      const res = await api.delete(`/posts/${post.id}`, { cookie: ownerCookie });

      // THEN 404 + NOT_FOUND
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });
  });

  // ============================================================
  // Error Handling — 驗證
  // ============================================================
  describe('Error Handling — 驗證', () => {
    it('WHEN 編輯貼文 content 為空 THEN returns 400 INVALID_INPUT', async () => {
      // GIVEN 使用者擁有一篇貼文
      const post = await createPost(ownerCookie, '將被清空');

      // WHEN PATCH with empty content
      const res = await api.patch(`/posts/${post.id}`, { content: '' }, { cookie: ownerCookie });

      // THEN 400 + INVALID_INPUT
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN 未登入編輯貼文 THEN returns 401 UNAUTHORIZED', async () => {
      // GIVEN 有一篇貼文
      const post = await createPost(ownerCookie, '未登入編輯測試');

      // WHEN PATCH without token
      const res = await api.patch(`/posts/${post.id}`, { content: 'test' });

      // THEN 401 + UNAUTHORIZED
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(errorCodes.UNAUTHORIZED);
    });

    it('WHEN 未登入刪除貼文 THEN returns 401 UNAUTHORIZED', async () => {
      // GIVEN 有一篇貼文
      const post = await createPost(ownerCookie, '未登入刪除測試');

      // WHEN DELETE without token
      const res = await api.delete(`/posts/${post.id}`);

      // THEN 401 + UNAUTHORIZED
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(errorCodes.UNAUTHORIZED);
    });
  });
});
