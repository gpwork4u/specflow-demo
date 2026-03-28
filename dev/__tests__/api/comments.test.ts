import { NextRequest } from "next/server";

// Mock Prisma
const mockPostFindUnique = jest.fn();
const mockCommentCreate = jest.fn();
const mockCommentFindMany = jest.fn();
const mockCommentFindUnique = jest.fn();
const mockCommentUpdate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: (...args: unknown[]) => mockPostFindUnique(...args),
    },
    comment: {
      create: (...args: unknown[]) => mockCommentCreate(...args),
      findMany: (...args: unknown[]) => mockCommentFindMany(...args),
      findUnique: (...args: unknown[]) => mockCommentFindUnique(...args),
      update: (...args: unknown[]) => mockCommentUpdate(...args),
    },
  },
}));

import { POST, GET } from "@/app/api/v1/posts/[id]/comments/route";
import { DELETE } from "@/app/api/v1/posts/[id]/comments/[commentId]/route";

const MOCK_USER = {
  id: "user-1",
  username: "john_doe",
  displayName: "John Doe",
};

const MOCK_USER_2 = {
  id: "user-2",
  username: "jane_doe",
  displayName: "Jane Doe",
};

const MOCK_POST = {
  id: "post-1",
  content: "Hello World!",
  authorId: "user-1",
  createdAt: new Date("2026-03-28T00:00:00.000Z"),
  updatedAt: new Date("2026-03-28T00:00:00.000Z"),
  deletedAt: null,
};

const MOCK_COMMENT = {
  id: "comment-1",
  content: "Great post!",
  authorId: "user-1",
  postId: "post-1",
  author: MOCK_USER,
  createdAt: new Date("2026-03-28T01:00:00.000Z"),
  deletedAt: null,
};

function buildPostRequest(
  postId: string,
  body: unknown,
  options: { userId?: string } = {}
): NextRequest {
  const { userId = "user-1" } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) {
    headers["x-user-id"] = userId;
    headers["x-user-email"] = "user@example.com";
  }

  return new NextRequest(
    `http://localhost:3000/api/v1/posts/${postId}/comments`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }
  );
}

function buildPostRequestWithoutAuth(
  postId: string,
  body: unknown
): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/posts/${postId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function buildGetRequest(
  postId: string,
  queryParams: Record<string, string> = {}
): NextRequest {
  const url = new URL(
    `http://localhost:3000/api/v1/posts/${postId}/comments`
  );
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

function buildDeleteRequest(
  postId: string,
  commentId: string,
  options: { userId?: string } = {}
): NextRequest {
  const { userId = "user-1" } = options;
  const headers: Record<string, string> = {};
  if (userId) {
    headers["x-user-id"] = userId;
    headers["x-user-email"] = "user@example.com";
  }

  return new NextRequest(
    `http://localhost:3000/api/v1/posts/${postId}/comments/${commentId}`,
    {
      method: "DELETE",
      headers,
    }
  );
}

function buildDeleteRequestWithoutAuth(
  postId: string,
  commentId: string
): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/posts/${postId}/comments/${commentId}`,
    {
      method: "DELETE",
    }
  );
}

const routeParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

const deleteRouteParams = (id: string, commentId: string) => ({
  params: Promise.resolve({ id, commentId }),
});

describe("POST /api/v1/posts/:id/comments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPostFindUnique.mockResolvedValue(MOCK_POST);
    mockCommentCreate.mockResolvedValue(MOCK_COMMENT);
  });

  describe("Happy Path", () => {
    it("Scenario: 建立留言成功", async () => {
      const req = buildPostRequest("post-1", { content: "Great post!" });

      const res = await POST(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.content).toBe("Great post!");
      expect(data.author.id).toBe("user-1");
      expect(data.author.username).toBe("john_doe");
      expect(data.author.display_name).toBe("John Doe");
      expect(data.post_id).toBe("post-1");
      expect(data.created_at).toBe("2026-03-28T01:00:00.000Z");

      expect(mockCommentCreate).toHaveBeenCalledWith({
        data: {
          content: "Great post!",
          authorId: "user-1",
          postId: "post-1",
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });
    });
  });

  describe("Error Handling", () => {
    it("Scenario: 未登入建立留言", async () => {
      const req = buildPostRequestWithoutAuth("post-1", {
        content: "test",
      });

      const res = await POST(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
      expect(mockCommentCreate).not.toHaveBeenCalled();
    });

    it("Scenario: 留言 content 為空", async () => {
      const req = buildPostRequest("post-1", { content: "" });

      const res = await POST(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(mockCommentCreate).not.toHaveBeenCalled();
    });

    it("Scenario: 留言 content 僅含空白", async () => {
      const req = buildPostRequest("post-1", { content: "   " });

      const res = await POST(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(mockCommentCreate).not.toHaveBeenCalled();
    });

    it("Scenario: 留言 content 超過 500 字", async () => {
      const req = buildPostRequest("post-1", {
        content: "a".repeat(501),
      });

      const res = await POST(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(mockCommentCreate).not.toHaveBeenCalled();
    });

    it("Scenario: 對不存在的貼文留言", async () => {
      mockPostFindUnique.mockResolvedValue(null);
      const req = buildPostRequest("nonexistent", { content: "test" });

      const res = await POST(req, routeParams("nonexistent"));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
      expect(mockCommentCreate).not.toHaveBeenCalled();
    });

    it("Scenario: 對已刪除的貼文留言", async () => {
      mockPostFindUnique.mockResolvedValue({
        ...MOCK_POST,
        deletedAt: new Date(),
      });
      const req = buildPostRequest("post-1", { content: "test" });

      const res = await POST(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
      expect(mockCommentCreate).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("Scenario: 留言 content 恰好 500 字", async () => {
      const longContent = "a".repeat(500);
      mockCommentCreate.mockResolvedValue({
        ...MOCK_COMMENT,
        content: longContent,
      });

      const req = buildPostRequest("post-1", { content: longContent });

      const res = await POST(req, routeParams("post-1"));

      expect(res.status).toBe(201);
      expect(mockCommentCreate).toHaveBeenCalled();
    });

    it("should trim content before saving", async () => {
      mockCommentCreate.mockResolvedValue({
        ...MOCK_COMMENT,
        content: "Great post!",
      });

      const req = buildPostRequest("post-1", {
        content: "  Great post!  ",
      });

      const res = await POST(req, routeParams("post-1"));

      expect(res.status).toBe(201);
      expect(mockCommentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            content: "Great post!",
            authorId: "user-1",
            postId: "post-1",
          },
        })
      );
    });
  });
});

describe("GET /api/v1/posts/:id/comments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPostFindUnique.mockResolvedValue(MOCK_POST);
  });

  describe("Happy Path", () => {
    it("Scenario: 取得貼文的留言列表", async () => {
      const comments = [
        {
          ...MOCK_COMMENT,
          id: "comment-1",
          createdAt: new Date("2026-03-28T01:00:00.000Z"),
        },
        {
          ...MOCK_COMMENT,
          id: "comment-2",
          content: "Nice!",
          createdAt: new Date("2026-03-28T02:00:00.000Z"),
        },
        {
          ...MOCK_COMMENT,
          id: "comment-3",
          content: "Cool!",
          createdAt: new Date("2026-03-28T03:00:00.000Z"),
        },
      ];
      mockCommentFindMany.mockResolvedValue(comments);

      const req = buildGetRequest("post-1");

      const res = await GET(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(3);
      expect(data.has_more).toBe(false);
      expect(data.next_cursor).toBeNull();
      // Verify sorted by created_at ASC
      expect(data.data[0].id).toBe("comment-1");
      expect(data.data[2].id).toBe("comment-3");
    });

    it("Scenario: 沒有留言的貼文", async () => {
      mockCommentFindMany.mockResolvedValue([]);

      const req = buildGetRequest("post-1");

      const res = await GET(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.has_more).toBe(false);
    });

    it("should paginate with has_more=true when more results exist", async () => {
      // Return limit+1 comments to indicate has_more
      const comments = Array.from({ length: 3 }, (_, i) => ({
        ...MOCK_COMMENT,
        id: `comment-${i + 1}`,
        createdAt: new Date(`2026-03-28T0${i + 1}:00:00.000Z`),
      }));
      mockCommentFindMany.mockResolvedValue(comments);

      const req = buildGetRequest("post-1", { limit: "2" });

      const res = await GET(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.has_more).toBe(true);
      expect(data.next_cursor).toBe("comment-2");
    });
  });

  describe("Error Handling", () => {
    it("Scenario: 貼文不存在時取得留言列表", async () => {
      mockPostFindUnique.mockResolvedValue(null);

      const req = buildGetRequest("nonexistent");

      const res = await GET(req, routeParams("nonexistent"));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("Scenario: 已刪除的貼文取得留言列表", async () => {
      mockPostFindUnique.mockResolvedValue({
        ...MOCK_POST,
        deletedAt: new Date(),
      });

      const req = buildGetRequest("post-1");

      const res = await GET(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });
  });
});

describe("DELETE /api/v1/posts/:id/comments/:commentId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPostFindUnique.mockResolvedValue(MOCK_POST);
    mockCommentFindUnique.mockResolvedValue(MOCK_COMMENT);
    mockCommentUpdate.mockResolvedValue({
      ...MOCK_COMMENT,
      deletedAt: new Date(),
    });
  });

  describe("Happy Path", () => {
    it("Scenario: 留言作者刪除自己的留言", async () => {
      const req = buildDeleteRequest("post-1", "comment-1", {
        userId: "user-1",
      });

      const res = await DELETE(
        req,
        deleteRouteParams("post-1", "comment-1")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("Comment deleted successfully");
      expect(mockCommentUpdate).toHaveBeenCalledWith({
        where: { id: "comment-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("Scenario: 貼文作者刪除他人的留言", async () => {
      // Post author is user-1, comment author is user-2
      mockCommentFindUnique.mockResolvedValue({
        ...MOCK_COMMENT,
        authorId: "user-2",
      });

      const req = buildDeleteRequest("post-1", "comment-2", {
        userId: "user-1",
      });

      const res = await DELETE(
        req,
        deleteRouteParams("post-1", "comment-2")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("Comment deleted successfully");
    });
  });

  describe("Error Handling", () => {
    it("Scenario: 未登入刪除留言", async () => {
      const req = buildDeleteRequestWithoutAuth("post-1", "comment-1");

      const res = await DELETE(
        req,
        deleteRouteParams("post-1", "comment-1")
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("Scenario: 非留言作者也非貼文作者刪除留言", async () => {
      // Post author is user-1, comment author is user-1, current user is user-3
      mockPostFindUnique.mockResolvedValue({
        ...MOCK_POST,
        authorId: "user-2",
      });

      const req = buildDeleteRequest("post-1", "comment-1", {
        userId: "user-3",
      });

      const res = await DELETE(
        req,
        deleteRouteParams("post-1", "comment-1")
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("Scenario: 刪除不存在的留言", async () => {
      mockCommentFindUnique.mockResolvedValue(null);

      const req = buildDeleteRequest("post-1", "nonexistent", {
        userId: "user-1",
      });

      const res = await DELETE(
        req,
        deleteRouteParams("post-1", "nonexistent")
      );
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("Scenario: 刪除已被刪除的留言", async () => {
      mockCommentFindUnique.mockResolvedValue({
        ...MOCK_COMMENT,
        deletedAt: new Date(),
      });

      const req = buildDeleteRequest("post-1", "comment-1", {
        userId: "user-1",
      });

      const res = await DELETE(
        req,
        deleteRouteParams("post-1", "comment-1")
      );
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("Scenario: 貼文不存在時刪除留言", async () => {
      mockPostFindUnique.mockResolvedValue(null);

      const req = buildDeleteRequest("nonexistent", "comment-1", {
        userId: "user-1",
      });

      const res = await DELETE(
        req,
        deleteRouteParams("nonexistent", "comment-1")
      );
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });
  });
});
