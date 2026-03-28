/**
 * F-008 留言功能 — API E2E Tests
 *
 * 根據 QA Issue #26 的 scenarios 撰寫。
 * Spec: specs/features/f008-comments.md
 * Feature Issue: #24
 */

import { api } from './helpers/api';
import { errorCodes } from './helpers/fixtures';
import { registerAndLogin, createPost, createComment } from './helpers/setup';

describe('POST/GET/DELETE /api/v1/posts/:id/comments', () => {
  // 三位使用者：postAuthor（貼文作者）、commenter（留言者）、other（第三方）
  let postAuthorCookie: string;
  let postAuthorUser: any;
  let commenterCookie: string;
  let commenterUser: any;
  let otherCookie: string;

  beforeAll(async () => {
    const pa = await registerAndLogin();
    postAuthorCookie = pa.cookie;
    postAuthorUser = pa.user;

    const cm = await registerAndLogin();
    commenterCookie = cm.cookie;
    commenterUser = cm.user;

    const ot = await registerAndLogin();
    otherCookie = ot.cookie;
  });

  // ============================================================
  // Happy Path — 建立留言
  // ============================================================
  describe('Happy Path — 建立留言', () => {
    it('WHEN 建立留言成功 THEN returns 201 with comment object', async () => {
      // GIVEN post exists
      const post = await createPost(postAuthorCookie, '留言測試貼文');

      // WHEN POST /api/v1/posts/:id/comments
      const res = await api.post(
        `/posts/${post.id}/comments`,
        { content: 'Great post!' },
        { cookie: commenterCookie }
      );

      // THEN 201 + comment object
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        content: 'Great post!',
      });
      expect(res.body.author).toBeDefined();
      expect(res.body.author.id).toBe(commenterUser.id);
    });

    it('WHEN 建立留言後 THEN post 的 comments_count 增加', async () => {
      // GIVEN post exists
      const post = await createPost(postAuthorCookie, '計數留言測試');
      const beforeRes = await api.get(`/posts/${post.id}`);
      const countBefore = beforeRes.body.comments_count;

      // WHEN 新增留言
      await api.post(
        `/posts/${post.id}/comments`,
        { content: '留言 +1' },
        { cookie: commenterCookie }
      );

      // THEN comments_count + 1
      const afterRes = await api.get(`/posts/${post.id}`);
      expect(afterRes.body.comments_count).toBe(countBefore + 1);
    });
  });

  // ============================================================
  // Happy Path — 留言列表
  // ============================================================
  describe('Happy Path — 留言列表', () => {
    it('WHEN 取得貼文的留言列表 THEN returns 200 with data array sorted by created_at ASC', async () => {
      // GIVEN post with 3 comments
      const post = await createPost(postAuthorCookie, '留言列表測試');
      await api.post(`/posts/${post.id}/comments`, { content: 'Comment 1' }, { cookie: commenterCookie });
      await api.post(`/posts/${post.id}/comments`, { content: 'Comment 2' }, { cookie: commenterCookie });
      await api.post(`/posts/${post.id}/comments`, { content: 'Comment 3' }, { cookie: commenterCookie });

      // WHEN GET /api/v1/posts/:id/comments
      const res = await api.get(`/posts/${post.id}/comments`);

      // THEN 200 + data array sorted by created_at ASC
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);

      // Verify ASC order
      const data = res.body.data;
      for (let i = 0; i < data.length - 1; i++) {
        const current = new Date(data[i].created_at).getTime();
        const next = new Date(data[i + 1].created_at).getTime();
        expect(current).toBeLessThanOrEqual(next);
      }
    });

    it('WHEN 未登入取得留言列表 THEN returns 200 (public route)', async () => {
      // GIVEN post with comments
      const post = await createPost(postAuthorCookie, '公開留言列表');
      await api.post(`/posts/${post.id}/comments`, { content: 'Public comment' }, { cookie: commenterCookie });

      // WHEN GET without token
      const res = await api.get(`/posts/${post.id}/comments`);

      // THEN 200
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Happy Path — 刪除留言
  // ============================================================
  describe('Happy Path — 刪除留言', () => {
    it('WHEN 留言作者刪除自己的留言 THEN returns 200', async () => {
      // GIVEN comment authored by commenter
      const post = await createPost(postAuthorCookie, '刪除留言測試');
      const commentRes = await api.post(
        `/posts/${post.id}/comments`,
        { content: '即將被刪除' },
        { cookie: commenterCookie }
      );
      const commentId = commentRes.body.id;

      // WHEN DELETE /api/v1/posts/:id/comments/:commentId
      const res = await api.delete(
        `/posts/${post.id}/comments/${commentId}`,
        { cookie: commenterCookie }
      );

      // THEN 200
      expect([200, 204]).toContain(res.status);
    });

    it('WHEN 刪除留言後 THEN post 的 comments_count 減少', async () => {
      // GIVEN post with a comment
      const post = await createPost(postAuthorCookie, '刪除後計數測試');
      const commentRes = await api.post(
        `/posts/${post.id}/comments`,
        { content: '計數用留言' },
        { cookie: commenterCookie }
      );
      const commentId = commentRes.body.id;
      const beforeRes = await api.get(`/posts/${post.id}`);
      const countBefore = beforeRes.body.comments_count;

      // WHEN DELETE
      await api.delete(`/posts/${post.id}/comments/${commentId}`, { cookie: commenterCookie });

      // THEN comments_count - 1
      const afterRes = await api.get(`/posts/${post.id}`);
      expect(afterRes.body.comments_count).toBe(countBefore - 1);
    });

    it('WHEN 貼文作者刪除他人的留言 THEN returns 200', async () => {
      // GIVEN comment authored by commenter, post authored by postAuthor
      const post = await createPost(postAuthorCookie, '貼文作者刪留言測試');
      const commentRes = await api.post(
        `/posts/${post.id}/comments`,
        { content: '他人的留言' },
        { cookie: commenterCookie }
      );
      const commentId = commentRes.body.id;

      // WHEN postAuthor deletes it
      const res = await api.delete(
        `/posts/${post.id}/comments/${commentId}`,
        { cookie: postAuthorCookie }
      );

      // THEN 200
      expect([200, 204]).toContain(res.status);
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================
  describe('Error Handling', () => {
    it('WHEN 未登入建立留言 THEN returns 401 UNAUTHORIZED', async () => {
      // GIVEN post exists
      const post = await createPost(postAuthorCookie, '未登入留言測試');

      // WHEN POST without token
      const res = await api.post(`/posts/${post.id}/comments`, { content: 'test' });

      // THEN 401
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(errorCodes.UNAUTHORIZED);
    });

    it('WHEN 留言 content 為空 THEN returns 400 INVALID_INPUT', async () => {
      // GIVEN post exists
      const post = await createPost(postAuthorCookie, '空留言測試');

      // WHEN POST with empty content
      const res = await api.post(
        `/posts/${post.id}/comments`,
        { content: '' },
        { cookie: commenterCookie }
      );

      // THEN 400
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN 留言 content 超過 500 字 THEN returns 400 INVALID_INPUT', async () => {
      // GIVEN post exists
      const post = await createPost(postAuthorCookie, '超長留言測試');

      // WHEN POST with content > 500 chars
      const res = await api.post(
        `/posts/${post.id}/comments`,
        { content: 'a'.repeat(501) },
        { cookie: commenterCookie }
      );

      // THEN 400
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(errorCodes.INVALID_INPUT);
    });

    it('WHEN 對不存在的貼文留言 THEN returns 404 NOT_FOUND', async () => {
      // WHEN POST to nonexistent post
      const res = await api.post(
        '/posts/nonexistent/comments',
        { content: 'test' },
        { cookie: commenterCookie }
      );

      // THEN 404
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });

    it('WHEN 對已刪除的貼文留言 THEN returns 404 NOT_FOUND', async () => {
      // GIVEN post is soft deleted
      const post = await createPost(postAuthorCookie, '已刪除貼文留言');
      await api.delete(`/posts/${post.id}`, { cookie: postAuthorCookie });

      // WHEN POST comment
      const res = await api.post(
        `/posts/${post.id}/comments`,
        { content: 'test' },
        { cookie: commenterCookie }
      );

      // THEN 404
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });

    it('WHEN 非留言作者也非貼文作者刪除留言 THEN returns 403 FORBIDDEN', async () => {
      // GIVEN comment by commenter on postAuthor's post
      const post = await createPost(postAuthorCookie, '權限測試');
      const commentRes = await api.post(
        `/posts/${post.id}/comments`,
        { content: '不能被第三方刪' },
        { cookie: commenterCookie }
      );
      const commentId = commentRes.body.id;

      // WHEN other user tries to delete
      const res = await api.delete(
        `/posts/${post.id}/comments/${commentId}`,
        { cookie: otherCookie }
      );

      // THEN 403
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(errorCodes.FORBIDDEN);
    });

    it('WHEN 刪除不存在的留言 THEN returns 404 NOT_FOUND', async () => {
      // GIVEN post exists
      const post = await createPost(postAuthorCookie, '刪除不存在留言');

      // WHEN DELETE nonexistent comment
      const res = await api.delete(
        `/posts/${post.id}/comments/nonexistent`,
        { cookie: postAuthorCookie }
      );

      // THEN 404
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(errorCodes.NOT_FOUND);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================
  describe('Edge Cases', () => {
    it('WHEN 留言 content 恰好 500 字 THEN returns 201', async () => {
      // GIVEN post exists
      const post = await createPost(postAuthorCookie, '邊界留言測試');

      // WHEN POST with exactly 500 chars
      const res = await api.post(
        `/posts/${post.id}/comments`,
        { content: 'a'.repeat(500) },
        { cookie: commenterCookie }
      );

      // THEN 201
      expect(res.status).toBe(201);
      expect(res.body.content).toBe('a'.repeat(500));
    });

    it('WHEN 沒有留言的貼文 THEN returns 200 with empty data', async () => {
      // GIVEN post with 0 comments
      const post = await createPost(postAuthorCookie, '零留言貼文');

      // WHEN GET /api/v1/posts/:id/comments
      const res = await api.get(`/posts/${post.id}/comments`);

      // THEN 200 + data = [] + has_more = false
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.has_more).toBe(false);
    });
  });
});
