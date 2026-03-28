import { signToken, verifyToken, buildTokenCookie } from "@/lib/auth";

describe("JWT auth utilities", () => {
  describe("signToken and verifyToken", () => {
    it("should sign and verify a token with correct payload", async () => {
      const payload = { sub: "user-123", email: "test@example.com" };
      const token = await signToken(payload);

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts

      const decoded = await verifyToken(token);
      expect(decoded.sub).toBe("user-123");
      expect(decoded.email).toBe("test@example.com");
    });

    it("should reject an invalid token", async () => {
      await expect(verifyToken("invalid.token.here")).rejects.toThrow();
    });

    it("should reject a tampered token", async () => {
      const token = await signToken({
        sub: "user-123",
        email: "test@example.com",
      });
      // Tamper with the token payload
      const parts = token.split(".");
      parts[1] = parts[1] + "tampered";
      const tamperedToken = parts.join(".");

      await expect(verifyToken(tamperedToken)).rejects.toThrow();
    });
  });

  describe("buildTokenCookie", () => {
    it("should build a proper Set-Cookie string", () => {
      const cookie = buildTokenCookie("my-jwt-token");

      expect(cookie).toContain("token=my-jwt-token");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
      expect(cookie).toContain("SameSite=Strict");
      expect(cookie).toContain("Path=/");
      expect(cookie).toContain("Max-Age=604800"); // 7 days
    });
  });
});
