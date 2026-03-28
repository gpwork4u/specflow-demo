import { hashPassword, verifyPassword } from "@/lib/password";

describe("password utilities", () => {
  it("should hash a password and verify it correctly", async () => {
    const plaintext = "MySecureP@ss123";
    const hash = await hashPassword(plaintext);

    // Hash should not be the same as plaintext
    expect(hash).not.toBe(plaintext);

    // Hash should start with bcrypt prefix
    expect(hash).toMatch(/^\$2[aby]?\$/);

    // Verification should succeed with correct password
    const isValid = await verifyPassword(plaintext, hash);
    expect(isValid).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const hash = await hashPassword("CorrectPass1");
    const isValid = await verifyPassword("WrongPass1", hash);
    expect(isValid).toBe(false);
  });

  it("should generate different hashes for the same password", async () => {
    const password = "SamePass123";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Due to random salt, hashes should differ
    expect(hash1).not.toBe(hash2);

    // Both should still verify
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it("should use bcrypt with proper salt rounds", async () => {
    const hash = await hashPassword("TestPass1");
    // bcrypt hash format: $2b$12$... where 12 is the salt rounds
    expect(hash).toMatch(/^\$2[aby]?\$12\$/);
  });
});
