import { NextRequest } from "next/server";

// Mock Prisma
const mockCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { POST } from "@/app/api/v1/posts/route";

const MOCK_USER = {
  id: "user-1",
  username: "john_doe",
  displayName: "John Doe",
};

const MOCK_POST = {
  id: "post-1",
  content: "Hello World!",
  authorId: "user-1",
  author: MOCK_USER,
  createdAt: new Date("2026-03-28T00:00:00.000Z"),
  updatedAt: new Date("2026-03-28T00:00:00.000Z"),
  deletedAt: null,
};

function buildRequest(
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

  return new NextRequest("http://localhost:3000/api/v1/posts", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function buildRequestWithoutAuth(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue(MOCK_POST);
  });

  describe("Happy Path", () => {
    it("Scenario: 建立貼文成功", async () => {
      const req = buildRequest({ content: "Hello World!" });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.content).toBe("Hello World!");
      expect(data.author.username).toBe("john_doe");
      expect(data.author.display_name).toBe("John Doe");
      expect(data.author.id).toBe("user-1");
      expect(data.likes_count).toBe(0);
      expect(data.comments_count).toBe(0);
      expect(data.id).toBe("post-1");
      expect(data.created_at).toBe("2026-03-28T00:00:00.000Z");
      expect(data.updated_at).toBe("2026-03-28T00:00:00.000Z");

      // Verify Prisma call
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          content: "Hello World!",
          authorId: "user-1",
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

    it("Scenario: 建立含中文內容的貼文", async () => {
      mockCreate.mockResolvedValue({
        ...MOCK_POST,
        content: "今天天氣很好",
      });

      const req = buildRequest({ content: "今天天氣很好" });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.content).toBe("今天天氣很好");
    });
  });

  describe("Error Handling", () => {
    it("Scenario: 未登入時建立貼文", async () => {
      const req = buildRequestWithoutAuth({ content: "Hello" });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("Scenario: content 為空字串", async () => {
      const req = buildRequest({ content: "" });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("Scenario: content 僅含空白", async () => {
      const req = buildRequest({ content: "   " });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("Scenario: content 超過 2000 字", async () => {
      const req = buildRequest({ content: "a".repeat(2001) });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("Scenario: 缺少 content 欄位", async () => {
      const req = buildRequest({});

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("Scenario: content 恰好 2000 字", async () => {
      const longContent = "a".repeat(2000);
      mockCreate.mockResolvedValue({
        ...MOCK_POST,
        content: longContent,
      });

      const req = buildRequest({ content: longContent });

      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(mockCreate).toHaveBeenCalled();
    });

    it("Scenario: content 恰好 1 字", async () => {
      mockCreate.mockResolvedValue({
        ...MOCK_POST,
        content: "a",
      });

      const req = buildRequest({ content: "a" });

      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(mockCreate).toHaveBeenCalled();
    });

    it("should trim content before saving", async () => {
      mockCreate.mockResolvedValue({
        ...MOCK_POST,
        content: "Hello World!",
      });

      const req = buildRequest({ content: "  Hello World!  " });

      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            content: "Hello World!",
            authorId: "user-1",
          },
        })
      );
    });
  });
});
