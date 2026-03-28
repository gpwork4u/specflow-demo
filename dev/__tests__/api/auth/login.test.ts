import { NextRequest } from "next/server";

// Mock Prisma
const mockFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

// Mock password verification
const mockVerifyPassword = jest.fn();
jest.mock("@/lib/password", () => ({
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}));

// Mock JWT
const mockSignToken = jest.fn();
const mockBuildTokenCookie = jest.fn();
jest.mock("@/lib/auth", () => ({
  signToken: (...args: unknown[]) => mockSignToken(...args),
  buildTokenCookie: (...args: unknown[]) => mockBuildTokenCookie(...args),
}));

import { POST } from "@/app/api/v1/auth/login/route";

function buildRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const MOCK_USER = {
  id: "uuid-123",
  email: "user@example.com",
  username: "john_doe",
  passwordHash: "$2a$12$hashedpassword",
  displayName: "John Doe",
  bio: null,
  createdAt: new Date("2026-03-28T00:00:00.000Z"),
  updatedAt: new Date("2026-03-28T00:00:00.000Z"),
};

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignToken.mockResolvedValue("mock-jwt-token");
    mockBuildTokenCookie.mockReturnValue(
      "token=mock-jwt-token; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800"
    );
  });

  describe("Happy Path", () => {
    it("should return 200 and set cookie on successful login", async () => {
      mockFindUnique.mockResolvedValue(MOCK_USER);
      mockVerifyPassword.mockResolvedValue(true);

      const req = buildRequest({
        email: "user@example.com",
        password: "MyPass123",
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({
        id: "uuid-123",
        email: "user@example.com",
        username: "john_doe",
        display_name: "John Doe",
        bio: null,
        created_at: "2026-03-28T00:00:00.000Z",
      });
      // Should NOT contain password_hash
      expect(data.password_hash).toBeUndefined();
      expect(data.passwordHash).toBeUndefined();

      // Check Set-Cookie header
      const setCookie = res.headers.get("Set-Cookie");
      expect(setCookie).toContain("token=");
      expect(setCookie).toContain("HttpOnly");

      // Verify correct calls
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "user@example.com" },
      });
      expect(mockVerifyPassword).toHaveBeenCalledWith(
        "MyPass123",
        MOCK_USER.passwordHash
      );
      expect(mockSignToken).toHaveBeenCalledWith({
        sub: "uuid-123",
        email: "user@example.com",
      });
    });

    it("should handle case-insensitive email login", async () => {
      mockFindUnique.mockResolvedValue(MOCK_USER);
      mockVerifyPassword.mockResolvedValue(true);

      const req = buildRequest({
        email: "USER@Example.com",
        password: "MyPass123",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // Email should be normalized to lowercase for lookup
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "user@example.com" },
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 401 when email does not exist", async () => {
      mockFindUnique.mockResolvedValue(null);

      const req = buildRequest({
        email: "nonexist@example.com",
        password: "MyPass123",
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.code).toBe("INVALID_CREDENTIALS");
      expect(data.message).toBe("Email or password is incorrect");
      // Should not call verifyPassword when user not found
      expect(mockVerifyPassword).not.toHaveBeenCalled();
    });

    it("should return 401 when password is wrong", async () => {
      mockFindUnique.mockResolvedValue(MOCK_USER);
      mockVerifyPassword.mockResolvedValue(false);

      const req = buildRequest({
        email: "user@example.com",
        password: "WrongPass1",
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.code).toBe("INVALID_CREDENTIALS");
      expect(data.message).toBe("Email or password is incorrect");
    });

    it("should return 400 when email is missing", async () => {
      const req = buildRequest({ password: "MyPass123" });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
    });

    it("should return 400 when password is missing", async () => {
      const req = buildRequest({ email: "user@example.com" });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
    });

    it("should return 400 when request body is empty", async () => {
      const req = buildRequest({});

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
    });

    it("should return 400 for invalid email format", async () => {
      const req = buildRequest({
        email: "not-an-email",
        password: "MyPass123",
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("INVALID_INPUT");
    });
  });
});
