import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, buildTokenCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { validateLoginInput } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          code: "INVALID_INPUT",
          message: "Invalid JSON in request body",
          details: [],
        },
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateLoginInput(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          code: "INVALID_INPUT",
          message: "Validation failed",
          details: validation.details,
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Normalize email to lowercase for case-insensitive lookup
    const normalizedEmail = email.toLowerCase();

    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If user not found, return generic error (do not reveal whether email exists)
    if (!user) {
      return NextResponse.json(
        {
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect",
        },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect",
        },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await signToken({ sub: user.id, email: user.email });
    const cookie = buildTokenCookie(token);

    // Return user data with Set-Cookie header
    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        display_name: user.displayName,
        bio: user.bio,
        created_at: user.createdAt.toISOString(),
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
