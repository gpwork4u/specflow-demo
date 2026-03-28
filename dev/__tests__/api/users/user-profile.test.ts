import { NextRequest } from "next/server";

// Mock Prisma
const mockUserFindUnique = jest.fn();
const mockPostFindMany = jest.fn();
const mockPostFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    post: {
      findMany: (...args: unknown[]) => mockPostFindMany(...args),
      findUnique: (...args: unknown[]) => mockPostFindUnique(...args),
    },
  },
}));

import { GET as getUserProfile } from "@/app/api/v1/users/[userId]/route";
import { GET as getUserPosts } from "@/app/api/v1/users/[userId]/posts/route";

const MOCK_USER = {
  id: "user-1",
  username: "john_doe",
  displayName: "John Doe",
  bio: "Hello!",
  createdAt: new Date("2026-03-28T00:00:00.000Z"),
  _count: { posts: 10 },
};

const MOCK_AUTHOR = {
  id: "user-1",
  username: "john_doe",
  displayName: "John Doe",
};

function makeMockPost(index: number) {
  const date = new Date(Date.now() - index * 60000);
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

function buildProfileRequest(userId: string): [NextRequest, { params: Promise<{ userId: string }> }] {
  const req = new NextRequest(`http://localhost:3000/api/v1/users/${userId}`);
  const routeParams = { params: Promise.resolve({ userId }) };
  return [req, routeParams];
}

function buildUserPostsRequest(
  userId: string,
  queryString = ""
): [NextRequest, { params: Promise<{ userId: string }> }] {
  const url = `http://localhost:3000/api/v1/users/${userId}/posts${queryString ? `?${queryString}` : ""}`;
  const req = new NextRequest(url);
  const routeParams = { params: Promise.resolve({ userId }) };
  return [req, routeParams];
}

describe("GET /api/v1/users/:userId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("Scenario: 查看使用者個人資訊", async () => {
      mockUserFindUnique.mockResolvedValue(MOCK_USER);

      const [req, params] = buildProfileRequest("user-1");
      const res = await getUserProfile(req, params);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe("user-1");
      expect(data.username).toBe("john_doe");
      expect(data.display_name).toBe("John Doe");
      expect(data.bio).toBe("Hello!");
      expect(data.posts_count).toBe(10);
      expect(data.created_at).toBe("2026-03-28T00:00:00.000Z");
    });

    it("Scenario: 不回傳 email 和 password_hash", async () => {
      mockUserFindUnique.mockResolvedValue(MOCK_USER);

      const [req, params] = buildProfileRequest("user-1");
      const res = await getUserProfile(req, params);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).not.toHaveProperty("email");
      expect(data).not.toHaveProperty("password_hash");
      expect(data).not.toHaveProperty("passwordHash");
    });

    it("Scenario: 未登入可查看個人頁面", async () => {
      mockUserFindUnique.mockResolvedValue(MOCK_USER);

      // No auth headers - still accessible
      const [req, params] = buildProfileRequest("user-1");
      const res = await getUserProfile(req, params);

      expect(res.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("Scenario: 查看不存在的使用者", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const [req, params] = buildProfileRequest("nonexistent");
      const res = await getUserProfile(req, params);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });
  });

  describe("Edge Cases", () => {
    it("Scenario: bio 為 null 的使用者", async () => {
      mockUserFindUnique.mockResolvedValue({ ...MOCK_USER, bio: null });

      const [req, params] = buildProfileRequest("user-1");
      const res = await getUserProfile(req, params);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.bio).toBeNull();
    });

    it("Scenario: posts_count 不含已刪除的貼文", async () => {
      // The _count.posts should reflect filtered count (deletedAt: null)
      mockUserFindUnique.mockResolvedValue({
        ...MOCK_USER,
        _count: { posts: 7 },
      });

      const [req, params] = buildProfileRequest("user-1");
      const res = await getUserProfile(req, params);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.posts_count).toBe(7);

      // Verify Prisma was called with the correct _count filter
      expect(mockUserFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            _count: {
              select: {
                posts: {
                  where: { deletedAt: null },
                },
              },
            },
          }),
        })
      );
    });
  });
});

describe("GET /api/v1/users/:userId/posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("Scenario: 查看使用者的貼文列表", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1" });
      const posts = Array.from({ length: 5 }, (_, i) => makeMockPost(i));
      mockPostFindMany.mockResolvedValue(posts);

      const [req, params] = buildUserPostsRequest("user-1");
      const res = await getUserPosts(req, params);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(5);
      expect(data.has_more).toBe(false);
      expect(data.next_cursor).toBeNull();

      // All posts should have author.id = "user-1"
      for (const post of data.data) {
        expect(post.author.id).toBe("user-1");
      }
    });

    it("should filter by authorId and exclude deleted posts", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1" });
      mockPostFindMany.mockResolvedValue([]);

      const [req, params] = buildUserPostsRequest("user-1");
      await getUserPosts(req, params);

      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: "user-1",
            deletedAt: null,
          }),
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should support cursor-based pagination", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1" });

      // 21 posts returned (limit+1) means has_more=true
      const posts = Array.from({ length: 21 }, (_, i) => makeMockPost(i));
      mockPostFindMany.mockResolvedValue(posts);

      const [req, params] = buildUserPostsRequest("user-1", "limit=20");
      const res = await getUserPosts(req, params);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(20);
      expect(data.has_more).toBe(true);
      expect(data.next_cursor).toBe("post-19");
    });

    it("should support pagination with cursor parameter", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1" });
      mockPostFindUnique.mockResolvedValue({
        createdAt: new Date("2026-03-28T00:20:00.000Z"),
      });

      const posts = Array.from({ length: 3 }, (_, i) => makeMockPost(i + 20));
      mockPostFindMany.mockResolvedValue(posts);

      const [req, params] = buildUserPostsRequest("user-1", "cursor=cursor-abc&limit=20");
      const res = await getUserPosts(req, params);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(3);
      expect(data.has_more).toBe(false);
      expect(data.next_cursor).toBeNull();
    });

    it("should return correct post format with likes_count and comments_count", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1" });
      const mockPost = makeMockPost(0);
      mockPostFindMany.mockResolvedValue([mockPost]);

      const [req, params] = buildUserPostsRequest("user-1");
      const res = await getUserPosts(req, params);
      const data = await res.json();

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
    it("Scenario: 查看不存在使用者的貼文", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const [req, params] = buildUserPostsRequest("nonexistent");
      const res = await getUserPosts(req, params);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should validate limit parameter", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1" });

      const [req, params] = buildUserPostsRequest("user-1", "limit=51");
      const res = await getUserPosts(req, params);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
    });
  });

  describe("Edge Cases", () => {
    it("Scenario: 使用者沒有貼文", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1" });
      mockPostFindMany.mockResolvedValue([]);

      const [req, params] = buildUserPostsRequest("user-1");
      const res = await getUserPosts(req, params);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.has_more).toBe(false);
      expect(data.next_cursor).toBeNull();
    });

    it("should return empty results when cursor points to non-existent post", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user-1" });
      mockPostFindUnique.mockResolvedValue(null);

      const [req, params] = buildUserPostsRequest("user-1", "cursor=nonexistent");
      const res = await getUserPosts(req, params);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.has_more).toBe(false);
    });
  });
});
