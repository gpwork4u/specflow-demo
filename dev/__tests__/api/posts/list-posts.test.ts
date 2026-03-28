import { NextRequest } from "next/server";

// Mock Prisma
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { GET } from "@/app/api/v1/posts/route";

const MOCK_AUTHOR = {
  id: "user-1",
  username: "john_doe",
  displayName: "John Doe",
};

function makeMockPost(index: number) {
  const date = new Date(Date.now() - index * 60000); // each post 1 min apart
  return {
    id: `post-${index}`,
    content: `Post content ${index}`,
    authorId: "user-1",
    author: MOCK_AUTHOR,
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  };
}

function buildRequest(queryString = ""): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/posts${queryString ? `?${queryString}` : ""}`
  );
}

describe("GET /api/v1/posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("Scenario: 取得貼文列表（第一頁）", async () => {
      // 25 posts, requesting limit=20, so findMany returns 21 (limit+1)
      const posts = Array.from({ length: 21 }, (_, i) => makeMockPost(i));
      mockFindMany.mockResolvedValue(posts);

      const req = buildRequest("limit=20");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(20);
      expect(data.has_more).toBe(true);
      expect(data.next_cursor).toBe("post-19");
      // Verify sorted by created_at DESC (findMany called with orderBy)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
          take: 21,
          where: { deletedAt: null },
        })
      );
    });

    it("Scenario: 取得貼文列表（第二頁）", async () => {
      const cursorPost = {
        createdAt: new Date("2026-03-28T00:20:00.000Z"),
      };
      mockFindUnique.mockResolvedValue(cursorPost);

      // Only 5 posts remaining (less than limit+1)
      const posts = Array.from({ length: 5 }, (_, i) => makeMockPost(i + 20));
      mockFindMany.mockResolvedValue(posts);

      const req = buildRequest("cursor=cursor-abc&limit=20");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(5);
      expect(data.has_more).toBe(false);
      expect(data.next_cursor).toBeNull();
    });

    it("Scenario: 取得貼文列表（使用預設 limit）", async () => {
      const posts = Array.from({ length: 10 }, (_, i) => makeMockPost(i));
      mockFindMany.mockResolvedValue(posts);

      const req = buildRequest();
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.length).toBeLessThanOrEqual(20);
      // Default limit is 20, so take should be 21
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 21 })
      );
    });

    it("Scenario: 未登入可瀏覽貼文", async () => {
      mockFindMany.mockResolvedValue([]);

      const req = buildRequest();
      const res = await GET(req);

      expect(res.status).toBe(200);
    });

    it("should return posts with correct response format", async () => {
      const mockPost = makeMockPost(0);
      mockFindMany.mockResolvedValue([mockPost]);

      const req = buildRequest();
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      const post = data.data[0];
      expect(post.id).toBe("post-0");
      expect(post.content).toBe("Post content 0");
      expect(post.author.id).toBe("user-1");
      expect(post.author.username).toBe("john_doe");
      expect(post.author.display_name).toBe("John Doe");
      expect(post.likes_count).toBe(0);
      expect(post.comments_count).toBe(0);
      expect(post.is_liked).toBe(false);
      expect(post.created_at).toBeDefined();
      expect(post.updated_at).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("Scenario: limit 超過 50", async () => {
      const req = buildRequest("limit=51");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
    });

    it("Scenario: limit 為 0", async () => {
      const req = buildRequest("limit=0");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
    });

    it("Scenario: limit 為負數", async () => {
      const req = buildRequest("limit=-1");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
    });
  });

  describe("Edge Cases", () => {
    it("Scenario: 沒有任何貼文", async () => {
      mockFindMany.mockResolvedValue([]);

      const req = buildRequest();
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.has_more).toBe(false);
      expect(data.next_cursor).toBeNull();
    });

    it("Scenario: cursor 指向不存在的 post", async () => {
      mockFindUnique.mockResolvedValue(null);

      const req = buildRequest("cursor=nonexistent-uuid");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.has_more).toBe(false);
    });

    it("should exclude soft-deleted posts via where clause", async () => {
      mockFindMany.mockResolvedValue([]);

      const req = buildRequest();
      await GET(req);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      );
    });
  });
});
