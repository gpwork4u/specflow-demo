import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-for-development-only"
);

const JWT_EXPIRATION = "7d";

export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Sign a JWT token with the given payload.
 * Token expires in 7 days.
 */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token.
 * Returns the payload if valid, throws if invalid.
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return {
    sub: payload.sub as string,
    email: payload.email as string,
  };
}

/**
 * Build a Set-Cookie header value for the JWT token.
 */
export function buildTokenCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  return `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

/**
 * Build a Set-Cookie header value that clears the JWT token cookie.
 */
export function buildClearTokenCookie(): string {
  return "token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}
