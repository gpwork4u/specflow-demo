/**
 * Unit tests for GET /api/v1/auth/me
 */

// Mock Prisma
const mockFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { GET } from "@/app/api/v1/auth/me/route";
import { NextRequest } from "next/server";

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const req = new NextRequest("http://localhost:3000/api/v1/auth/me", {
    method: "GET",
    headers,
  });
  return req;
}

describe("GET /api/v1/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return user data when x-user-id header is present", async () => {
    const mockUser = {
      id: "user-uuid-123",
      email: "user@example.com",
      username: "john_doe",
      displayName: "John Doe",
      bio: null,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
    };
    mockFindUnique.mockResolvedValue(mockUser);

    const request = createMockRequest({ "x-user-id": "user-uuid-123" });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: "user-uuid-123",
      email: "user@example.com",
      username: "john_doe",
      display_name: "John Doe",
      bio: null,
      created_at: "2026-03-28T00:00:00.000Z",
    });
    expect(body).not.toHaveProperty("password_hash");
    expect(body).not.toHaveProperty("passwordHash");
  });

  it("should query user with correct select fields (no passwordHash)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-uuid-123",
      email: "user@example.com",
      username: "john_doe",
      displayName: "John Doe",
      bio: null,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
    });

    const request = createMockRequest({ "x-user-id": "user-uuid-123" });
    await GET(request);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-uuid-123" },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        createdAt: true,
      },
    });
  });

  it("should return 401 when x-user-id header is missing", async () => {
    const request = createMockRequest({});
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("should return 401 when user not found in database", async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = createMockRequest({ "x-user-id": "nonexistent-user" });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("should return 500 when database throws an error", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB connection failed"));

    const request = createMockRequest({ "x-user-id": "user-uuid-123" });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
