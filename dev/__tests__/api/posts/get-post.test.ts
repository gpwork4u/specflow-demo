import { NextRequest } from "next/server";

// Mock Prisma
const mockFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { GET } from "@/app/api/v1/posts/[id]/route";

const MOCK_AUTHOR = {
  id: "user-1",
  username: "john_doe",
  displayName: "John Doe",
};

const MOCK_POST = {
  id: "post-1",
  content: "Hello World",
  authorId: "user-1",
  author: MOCK_AUTHOR,
  createdAt: new Date("2026-03-28T00:00:00.000Z"),
  updatedAt: new Date("2026-03-28T00:00:00.000Z"),
  deletedAt: null,
  _count: { likes: 0 },
};

function buildRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/posts/${id}`);
}

function buildParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/v1/posts/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("Scenario: 取得單篇貼文詳情", async () => {
      mockFindUnique.mockResolvedValue(MOCK_POST);

      const req = buildRequest("post-1");
      const res = await GET(req, buildParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe("post-1");
      expect(data.content).toBe("Hello World");
      expect(data.author.id).toBe("user-1");
      expect(data.author.username).toBe("john_doe");
      expect(data.author.display_name).toBe("John Doe");
      expect(data.likes_count).toBe(0);
      expect(data.comments_count).toBe(0);
      expect(data.is_liked).toBe(false);
      expect(data.created_at).toBe("2026-03-28T00:00:00.000Z");
      expect(data.updated_at).toBe("2026-03-28T00:00:00.000Z");
    });

    it("should call prisma with correct params", async () => {
      mockFindUnique.mockResolvedValue(MOCK_POST);

      const req = buildRequest("post-1");
      await GET(req, buildParams("post-1"));

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "post-1" },
        include: expect.objectContaining({
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          _count: { select: { likes: true } },
        }),
      });
    });
  });

  describe("Error Handling", () => {
    it("Scenario: 貼文不存在", async () => {
      mockFindUnique.mockResolvedValue(null);

      const req = buildRequest("nonexistent-uuid");
      const res = await GET(req, buildParams("nonexistent-uuid"));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("Scenario: 已刪除的貼文回傳 404", async () => {
      mockFindUnique.mockResolvedValue({
        ...MOCK_POST,
        deletedAt: new Date("2026-03-28T01:00:00.000Z"),
      });

      const req = buildRequest("post-1");
      const res = await GET(req, buildParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return 500 on unexpected error", async () => {
      mockFindUnique.mockRejectedValue(new Error("DB connection failed"));

      const req = buildRequest("post-1");
      const res = await GET(req, buildParams("post-1"));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });
});
