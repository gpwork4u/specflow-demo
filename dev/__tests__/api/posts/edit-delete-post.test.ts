import { NextRequest } from "next/server";

// Mock Prisma
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

import { PATCH, DELETE } from "@/app/api/v1/posts/[id]/route";

const MOCK_USER = {
  id: "user-1",
  username: "john_doe",
  displayName: "John Doe",
};

const MOCK_POST = {
  id: "post-1",
  content: "Original content",
  authorId: "user-1",
  author: MOCK_USER,
  createdAt: new Date("2026-03-28T00:00:00.000Z"),
  updatedAt: new Date("2026-03-28T00:00:00.000Z"),
  deletedAt: null,
};

const MOCK_DELETED_POST = {
  ...MOCK_POST,
  deletedAt: new Date("2026-03-28T01:00:00.000Z"),
};

function buildPatchRequest(
  postId: string,
  body: unknown,
  options: { userId?: string | null } = {}
): [NextRequest, { params: Promise<{ id: string }> }] {
  const { userId = "user-1" } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) {
    headers["x-user-id"] = userId;
    headers["x-user-email"] = "user@example.com";
  }

  const req = new NextRequest(
    `http://localhost:3000/api/v1/posts/${postId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    }
  );

  return [req, { params: Promise.resolve({ id: postId }) }];
}

function buildDeleteRequest(
  postId: string,
  options: { userId?: string | null } = {}
): [NextRequest, { params: Promise<{ id: string }> }] {
  const { userId = "user-1" } = options;
  const headers: Record<string, string> = {};
  if (userId) {
    headers["x-user-id"] = userId;
    headers["x-user-email"] = "user@example.com";
  }

  const req = new NextRequest(
    `http://localhost:3000/api/v1/posts/${postId}`,
    {
      method: "DELETE",
      headers,
    }
  );

  return [req, { params: Promise.resolve({ id: postId }) }];
}

describe("PATCH /api/v1/posts/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("Scenario: 編輯自己的貼文", async () => {
      mockFindUnique.mockResolvedValue(MOCK_POST);
      const updatedPost = {
        ...MOCK_POST,
        content: "更新內容",
        updatedAt: new Date("2026-03-28T01:00:00.000Z"),
        author: MOCK_USER,
        _count: { comments: 0 },
      };
      mockUpdate.mockResolvedValue(updatedPost);

      const [req, routeParams] = buildPatchRequest("post-1", {
        content: "更新內容",
      });

      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.content).toBe("更新內容");
      expect(data.author.id).toBe("user-1");
      expect(data.author.username).toBe("john_doe");
      expect(data.author.display_name).toBe("John Doe");
      expect(data.id).toBe("post-1");
      expect(data.updated_at).toBe("2026-03-28T01:00:00.000Z");
      expect(data.created_at).toBe("2026-03-28T00:00:00.000Z");

      // Verify Prisma update call
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "post-1" },
        data: { content: "更新內容" },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          _count: {
            select: { comments: { where: { deletedAt: null } } },
          },
        },
      });
    });
  });

  describe("Error Handling", () => {
    it("Scenario: 編輯他人的貼文", async () => {
      mockFindUnique.mockResolvedValue(MOCK_POST);

      const [req, routeParams] = buildPatchRequest(
        "post-1",
        { content: "惡意修改" },
        { userId: "user-2" }
      );

      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("Scenario: 編輯不存在的貼文", async () => {
      mockFindUnique.mockResolvedValue(null);

      const [req, routeParams] = buildPatchRequest("nonexistent", {
        content: "test",
      });

      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("Scenario: 編輯已刪除的貼文", async () => {
      mockFindUnique.mockResolvedValue(MOCK_DELETED_POST);

      const [req, routeParams] = buildPatchRequest("post-1", {
        content: "test",
      });

      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("Scenario: 編輯貼文 content 為空", async () => {
      mockFindUnique.mockResolvedValue(MOCK_POST);

      const [req, routeParams] = buildPatchRequest("post-1", {
        content: "",
      });

      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("Scenario: 編輯貼文 content 僅含空白", async () => {
      mockFindUnique.mockResolvedValue(MOCK_POST);

      const [req, routeParams] = buildPatchRequest("post-1", {
        content: "   ",
      });

      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("Scenario: 編輯貼文 content 超過 2000 字", async () => {
      mockFindUnique.mockResolvedValue(MOCK_POST);

      const [req, routeParams] = buildPatchRequest("post-1", {
        content: "a".repeat(2001),
      });

      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("Scenario: 未登入編輯貼文", async () => {
      const [req, routeParams] = buildPatchRequest(
        "post-1",
        { content: "test" },
        { userId: null }
      );

      const res = await PATCH(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});

describe("DELETE /api/v1/posts/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("Scenario: 刪除自己的貼文", async () => {
      mockFindUnique.mockResolvedValue(MOCK_POST);
      mockUpdate.mockResolvedValue({
        ...MOCK_POST,
        deletedAt: new Date("2026-03-28T01:00:00.000Z"),
      });

      const [req, routeParams] = buildDeleteRequest("post-1");

      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("Post deleted successfully");

      // Verify soft delete
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "post-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe("Error Handling", () => {
    it("Scenario: 刪除他人的貼文", async () => {
      mockFindUnique.mockResolvedValue(MOCK_POST);

      const [req, routeParams] = buildDeleteRequest("post-1", {
        userId: "user-2",
      });

      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("Scenario: 刪除不存在的貼文", async () => {
      mockFindUnique.mockResolvedValue(null);

      const [req, routeParams] = buildDeleteRequest("nonexistent");

      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("Scenario: 刪除已刪除的貼文（冪等）", async () => {
      mockFindUnique.mockResolvedValue(MOCK_DELETED_POST);

      const [req, routeParams] = buildDeleteRequest("post-1");

      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("Scenario: 未登入刪除貼文", async () => {
      const [req, routeParams] = buildDeleteRequest("post-1", {
        userId: null,
      });

      const res = await DELETE(req, routeParams);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
