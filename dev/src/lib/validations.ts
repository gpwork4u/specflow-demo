import { z } from "zod";

/**
 * Registration request validation schema.
 *
 * Rules:
 * - email: valid format, max 255 chars
 * - username: 3-30 chars, only letters/digits/underscores
 * - password: 8-72 chars, at least one uppercase, one lowercase, one digit
 * - display_name: 1-50 chars
 */
export const registerSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .max(255, "Email must be at most 255 characters"),
  username: z
    .string({ required_error: "Username is required" })
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),
  display_name: z
    .string({ required_error: "Display name is required" })
    .min(1, "Display name is required")
    .max(50, "Display name must be at most 50 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login request validation schema.
 *
 * Rules:
 * - email: valid format, required
 * - password: non-empty string, required
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Validate registration input and return parsed data or error details.
 */
export function validateRegisterInput(data: unknown):
  | { success: true; data: RegisterInput }
  | {
      success: false;
      details: Array<{ field: string; message: string }>;
    } {
  const result = registerSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const details = result.error.issues.map((issue) => ({
    field: issue.path.join(".") || "unknown",
    message: issue.message,
  }));

  return { success: false, details };
}

/**
 * Validate login input and return parsed data or error details.
 */
export function validateLoginInput(data: unknown):
  | { success: true; data: LoginInput }
  | {
      success: false;
      details: Array<{ field: string; message: string }>;
    } {
  const result = loginSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const details = result.error.issues.map((issue) => ({
    field: issue.path.join(".") || "unknown",
    message: issue.message,
  }));

  return { success: false, details };
}
