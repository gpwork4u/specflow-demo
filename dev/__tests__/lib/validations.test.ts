import { validateRegisterInput, registerSchema } from "@/lib/validations";

describe("registerSchema", () => {
  const validInput = {
    email: "user@example.com",
    username: "john_doe",
    password: "MyPass123",
    display_name: "John Doe",
  };

  describe("happy path", () => {
    it("should accept valid input", () => {
      const result = validateRegisterInput(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
        expect(result.data.username).toBe("john_doe");
        expect(result.data.display_name).toBe("John Doe");
      }
    });

    it("should accept username with exactly 3 characters (minimum)", () => {
      const result = validateRegisterInput({ ...validInput, username: "abc" });
      expect(result.success).toBe(true);
    });

    it("should accept username with exactly 30 characters (maximum)", () => {
      const result = validateRegisterInput({
        ...validInput,
        username: "a".repeat(30),
      });
      expect(result.success).toBe(true);
    });

    it("should accept password with exactly 8 characters (minimum)", () => {
      const result = validateRegisterInput({
        ...validInput,
        password: "MyPass12",
      });
      expect(result.success).toBe(true);
    });

    it("should accept username with underscores and digits", () => {
      const result = validateRegisterInput({
        ...validInput,
        username: "user_123",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("email validation", () => {
    it("should reject missing email", () => {
      const { email, ...rest } = validInput;
      const result = validateRegisterInput(rest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details.some((d) => d.field === "email")).toBe(true);
      }
    });

    it("should reject invalid email format", () => {
      const result = validateRegisterInput({
        ...validInput,
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details.some((d) => d.field === "email")).toBe(true);
      }
    });

    it("should reject email longer than 255 characters", () => {
      const result = validateRegisterInput({
        ...validInput,
        email: "a".repeat(250) + "@b.com",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details.some((d) => d.field === "email")).toBe(true);
      }
    });
  });

  describe("username validation", () => {
    it("should reject missing username", () => {
      const { username, ...rest } = validInput;
      const result = validateRegisterInput(rest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details.some((d) => d.field === "username")).toBe(true);
      }
    });

    it("should reject username shorter than 3 characters", () => {
      const result = validateRegisterInput({ ...validInput, username: "ab" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details.some((d) => d.field === "username")).toBe(true);
      }
    });

    it("should reject username longer than 30 characters", () => {
      const result = validateRegisterInput({
        ...validInput,
        username: "a".repeat(31),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details.some((d) => d.field === "username")).toBe(true);
      }
    });

    it("should reject username with special characters", () => {
      const result = validateRegisterInput({
        ...validInput,
        username: "user name!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details.some((d) => d.field === "username")).toBe(true);
      }
    });

    it("should reject username with spaces", () => {
      const result = validateRegisterInput({
        ...validInput,
        username: "user name",
      });
      expect(result.success).toBe(false);
    });

    it("should reject username with hyphens", () => {
      const result = validateRegisterInput({
        ...validInput,
        username: "user-name",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("password validation", () => {
    it("should reject missing password", () => {
      const { password, ...rest } = validInput;
      const result = validateRegisterInput(rest);
      expect(result.success).toBe(false);
    });

    it("should reject password shorter than 8 characters", () => {
      const result = validateRegisterInput({ ...validInput, password: "Ab1" });
      expect(result.success).toBe(false);
    });

    it("should reject password longer than 72 characters", () => {
      const result = validateRegisterInput({
        ...validInput,
        password: "A1" + "a".repeat(71),
      });
      expect(result.success).toBe(false);
    });

    it("should reject password without uppercase letter", () => {
      const result = validateRegisterInput({
        ...validInput,
        password: "mypass123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password without lowercase letter", () => {
      const result = validateRegisterInput({
        ...validInput,
        password: "MYPASS123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject password without digit", () => {
      const result = validateRegisterInput({
        ...validInput,
        password: "MyPassword",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("display_name validation", () => {
    it("should reject missing display_name", () => {
      const { display_name, ...rest } = validInput;
      const result = validateRegisterInput(rest);
      expect(result.success).toBe(false);
    });

    it("should reject empty display_name", () => {
      const result = validateRegisterInput({
        ...validInput,
        display_name: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details.some((d) => d.field === "display_name")).toBe(
          true
        );
      }
    });

    it("should reject display_name longer than 50 characters", () => {
      const result = validateRegisterInput({
        ...validInput,
        display_name: "a".repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it("should accept display_name with exactly 1 character", () => {
      const result = validateRegisterInput({
        ...validInput,
        display_name: "A",
      });
      expect(result.success).toBe(true);
    });

    it("should accept display_name with exactly 50 characters", () => {
      const result = validateRegisterInput({
        ...validInput,
        display_name: "a".repeat(50),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("multiple errors", () => {
    it("should return errors for all invalid fields", () => {
      const result = validateRegisterInput({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details.length).toBeGreaterThanOrEqual(4);
      }
    });
  });
});
