import { NextRequest } from "next/server";

// Mock Prisma
const mockPostFindUnique = jest.fn();
const mockLikeFindUnique = jest.fn();
const mockLikeCreate = jest.fn();
const mockLikeDelete = jest.fn();
const mockLikeCount = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: (...args: unknown[]) => mockPostFindUnique(...args),
    },
    like: {
      findUnique: (...args: unknown[]) => mockLikeFindUnique(...args),
      create: (...args: unknown[]) => mockLikeCreate(...args),
      delete: (...args: unknown[]) => mockLikeDelete(...args),
      count: (...args: unknown[]) => mockLikeCount(...args),
    },
  },
}));

import { POST, DELETE } from "@/app/api/v1/posts/[id]/likes/route";

const MOCK_POST = {
  id: "post-1",
  content: "Hello World!",
  authorId: "author-1",
  createdAt: new Date("2026-03-28T00:00:00.000Z"),
  updatedAt: new Date("2026-03-28T00:00:00.000Z"),
  deletedAt: null,
};

const MOCK_DELETED_POST = {
  ...MOCK_POST,
  id: "deleted-post",
  deletedAt: new Date("2026-03-28T00:00:00.000Z"),
};

const MOCK_LIKE = {
  id: "like-1",
  userId: "user-1",
  postId: "post-1",
  createdAt: new Date("2026-03-28T00:00:00.000Z"),
};

function buildRequest(
  method: "POST" | "DELETE",
  postId: string,
  options: { userId?: string | null } = {}
): NextRequest {
  const { userId = "user-1" } = options;
  const headers: Record<string, string> = {};
  if (userId) {
    headers["x-user-id"] = userId;
    headers["x-user-email"] = "user@example.com";
  }

  return new NextRequest(
    `http://localhost:3000/api/v1/posts/${postId}/likes`,
    { method, headers }
  );
}

function routeParams(postId: string) {
  return { params: Promise.resolve({ id: postId }) };
}

describe("POST /api/v1/posts/:id/likes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("Scenario: 按讚成功", async () => {
      mockPostFindUnique.mockResolvedValue(MOCK_POST);
      mockLikeFindUnique.mockResolvedValue(null);
      mockLikeCreate.mockResolvedValue(MOCK_LIKE);
      mockLikeCount.mockResolvedValue(6);

      const req = buildRequest("POST", "post-1");
      const res = await POST(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.post_id).toBe("post-1");
      expect(data.likes_count).toBe(6);
      expect(data.is_liked).toBe(true);

      // Verify like was created with correct data
      expect(mockLikeCreate).toHaveBeenCalledWith({
        data: { userId: "user-1", postId: "post-1" },
      });
    });

    it("Scenario: 對自己的貼文按讚", async () => {
      const ownPost = { ...MOCK_POST, authorId: "user-1" };
      mockPostFindUnique.mockResolvedValue(ownPost);
      mockLikeFindUnique.mockResolvedValue(null);
      mockLikeCreate.mockResolvedValue({ ...MOCK_LIKE });
      mockLikeCount.mockResolvedValue(1);

      const req = buildRequest("POST", "post-1", { userId: "user-1" });
      const res = await POST(req, routeParams("post-1"));

      expect(res.status).toBe(201);
    });
  });

  describe("Error Handling", () => {
    it("Scenario: 重複按讚", async () => {
      mockPostFindUnique.mockResolvedValue(MOCK_POST);
      mockLikeFindUnique.mockResolvedValue(MOCK_LIKE);

      const req = buildRequest("POST", "post-1");
      const res = await POST(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("ALREADY_LIKED");
      expect(mockLikeCreate).not.toHaveBeenCalled();
    });

    it("Scenario: 對不存在的貼文按讚", async () => {
      mockPostFindUnique.mockResolvedValue(null);

      const req = buildRequest("POST", "nonexistent");
      const res = await POST(req, routeParams("nonexistent"));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
      expect(mockLikeFindUnique).not.toHaveBeenCalled();
      expect(mockLikeCreate).not.toHaveBeenCalled();
    });

    it("Scenario: 對已刪除的貼文按讚", async () => {
      mockPostFindUnique.mockResolvedValue(MOCK_DELETED_POST);

      const req = buildRequest("POST", "deleted-post");
      const res = await POST(req, routeParams("deleted-post"));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
      expect(mockLikeFindUnique).not.toHaveBeenCalled();
      expect(mockLikeCreate).not.toHaveBeenCalled();
    });

    it("Scenario: 未登入按讚", async () => {
      const req = buildRequest("POST", "post-1", { userId: null });
      const res = await POST(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
      expect(mockPostFindUnique).not.toHaveBeenCalled();
    });
  });
});

describe("DELETE /api/v1/posts/:id/likes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("Scenario: 取消按讚成功", async () => {
      mockPostFindUnique.mockResolvedValue(MOCK_POST);
      mockLikeFindUnique.mockResolvedValue(MOCK_LIKE);
      mockLikeDelete.mockResolvedValue(MOCK_LIKE);
      mockLikeCount.mockResolvedValue(4);

      const req = buildRequest("DELETE", "post-1");
      const res = await DELETE(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.post_id).toBe("post-1");
      expect(data.likes_count).toBe(4);
      expect(data.is_liked).toBe(false);

      // Verify like was deleted
      expect(mockLikeDelete).toHaveBeenCalledWith({
        where: {
          userId_postId: { userId: "user-1", postId: "post-1" },
        },
      });
    });
  });

  describe("Error Handling", () => {
    it("Scenario: 取消未按過的讚", async () => {
      mockPostFindUnique.mockResolvedValue(MOCK_POST);
      mockLikeFindUnique.mockResolvedValue(null);

      const req = buildRequest("DELETE", "post-1");
      const res = await DELETE(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("NOT_LIKED");
      expect(mockLikeDelete).not.toHaveBeenCalled();
    });

    it("Scenario: 對不存在的貼文取消按讚", async () => {
      mockPostFindUnique.mockResolvedValue(null);

      const req = buildRequest("DELETE", "nonexistent");
      const res = await DELETE(req, routeParams("nonexistent"));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
      expect(mockLikeDelete).not.toHaveBeenCalled();
    });

    it("Scenario: 對已刪除的貼文取消按讚", async () => {
      mockPostFindUnique.mockResolvedValue(MOCK_DELETED_POST);

      const req = buildRequest("DELETE", "deleted-post");
      const res = await DELETE(req, routeParams("deleted-post"));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
      expect(mockLikeDelete).not.toHaveBeenCalled();
    });

    it("Scenario: 未登入取消按讚", async () => {
      const req = buildRequest("DELETE", "post-1", { userId: null });
      const res = await DELETE(req, routeParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
      expect(mockPostFindUnique).not.toHaveBeenCalled();
    });
  });
});
