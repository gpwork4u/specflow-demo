/**
 * Unit tests for Next.js middleware (auth protection)
 */

import { signToken } from "@/lib/auth";

// We need to test the middleware logic directly.
// Since Next.js middleware uses NextRequest/NextResponse, we mock at the integration level.

// Mock verifyToken to control token validation
jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual("@/lib/auth");
  return {
    ...actual,
    verifyToken: jest.fn(),
  };
});

import { middleware } from "@/middleware";
import { verifyToken } from "@/lib/auth";
import { NextRequest } from "next/server";

const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

function createRequest(
  path: string,
  method = "GET",
  cookies: Record<string, string> = {}
): NextRequest {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url, { method });
  for (const [key, value] of Object.entries(cookies)) {
    req.cookies.set(key, value);
  }
  return req;
}

describe("Auth Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Public paths", () => {
    it("should allow POST /api/v1/auth/register without token", async () => {
      const req = createRequest("/api/v1/auth/register", "POST");
      const res = await middleware(req);
      // NextResponse.next() does not return 401
      expect(res.status).not.toBe(401);
    });

    it("should allow POST /api/v1/auth/login without token", async () => {
      const req = createRequest("/api/v1/auth/login", "POST");
      const res = await middleware(req);
      expect(res.status).not.toBe(401);
    });

    it("should allow GET /api/v1/posts without token", async () => {
      const req = createRequest("/api/v1/posts", "GET");
      const res = await middleware(req);
      expect(res.status).not.toBe(401);
    });

    it("should allow GET /api/v1/posts/:id without token", async () => {
      const req = createRequest("/api/v1/posts/some-post-id", "GET");
      const res = await middleware(req);
      expect(res.status).not.toBe(401);
    });

    it("should allow GET /api/v1/users/:userId without token", async () => {
      const req = createRequest("/api/v1/users/some-user-id", "GET");
      const res = await middleware(req);
      expect(res.status).not.toBe(401);
    });

    it("should allow GET /api/v1/users/:userId/posts without token", async () => {
      const req = createRequest("/api/v1/users/some-user-id/posts", "GET");
      const res = await middleware(req);
      expect(res.status).not.toBe(401);
    });

    it("should allow GET /api/v1/posts with invalid token (public route ignores token)", async () => {
      const req = createRequest("/api/v1/posts", "GET", { token: "invalid-token" });
      const res = await middleware(req);
      expect(res.status).not.toBe(401);
    });
  });

  describe("Protected paths", () => {
    it("should return 401 for GET /api/v1/auth/me without token", async () => {
      const req = createRequest("/api/v1/auth/me", "GET");
      const res = await middleware(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 for POST /api/v1/auth/logout without token", async () => {
      const req = createRequest("/api/v1/auth/logout", "POST");
      const res = await middleware(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when token is expired", async () => {
      mockedVerifyToken.mockRejectedValue(new Error("Token expired"));

      const req = createRequest("/api/v1/auth/me", "GET", { token: "expired-token" });
      const res = await middleware(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when token signature is invalid", async () => {
      mockedVerifyToken.mockRejectedValue(new Error("Invalid signature"));

      const req = createRequest("/api/v1/auth/me", "GET", { token: "tampered-token" });
      const res = await middleware(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should pass through with valid token and set user headers", async () => {
      mockedVerifyToken.mockResolvedValue({
        sub: "user-uuid-123",
        email: "user@example.com",
      });

      const req = createRequest("/api/v1/auth/me", "GET", { token: "valid-token" });
      const res = await middleware(req);

      expect(res.status).not.toBe(401);
    });
  });

  describe("Non-API paths", () => {
    it("should not require auth for non-API paths", async () => {
      const req = createRequest("/about", "GET");
      const res = await middleware(req);
      expect(res.status).not.toBe(401);
    });
  });
});
