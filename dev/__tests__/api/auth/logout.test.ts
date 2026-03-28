/**
 * Unit tests for POST /api/v1/auth/logout
 */

// Mock next/server
const mockJsonResponse = jest.fn();
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => {
      const response = {
        status: init?.status ?? 200,
        body,
        headers: new Map(Object.entries(init?.headers ?? {})),
      };
      mockJsonResponse(response);
      return response;
    },
  },
}));

import { POST } from "@/app/api/v1/auth/logout/route";

describe("POST /api/v1/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 with success message", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Logged out successfully" });
  });

  it("should set Set-Cookie header with Max-Age=0 to clear the token", async () => {
    const response = await POST();

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("token=;");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain("Path=/");
  });
});
