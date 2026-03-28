import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, buildTokenCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { validateRegisterInput } from "@/lib/validations";

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
    const validation = validateRegisterInput(body);
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

    const { email, username, password, display_name } = validation.data;

    // Normalize email and username to lowercase
    const normalizedEmail = email.toLowerCase();
    const normalizedUsername = username.toLowerCase();

    // Check for duplicate email
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      return NextResponse.json(
        {
          code: "EMAIL_TAKEN",
          message: "This email is already registered",
        },
        { status: 409 }
      );
    }

    // Check for duplicate username
    const existingUsername = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
    if (existingUsername) {
      return NextResponse.json(
        {
          code: "USERNAME_TAKEN",
          message: "This username is already taken",
        },
        { status: 409 }
      );
    }

    // Hash password with bcrypt (salt rounds = 12)
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
        displayName: display_name,
      },
    });

    // Generate JWT token
    const token = await signToken({ sub: user.id, email: user.email });
    const cookie = buildTokenCookie(token);

    // Return response with Set-Cookie header
    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        display_name: user.displayName,
        created_at: user.createdAt.toISOString(),
      },
      {
        status: 201,
        headers: {
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
