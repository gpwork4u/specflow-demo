import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCreatePostInput } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user ID from middleware-injected header
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

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
    const validation = validateCreatePostInput(body);
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

    const { content } = validation.data;

    // Create post with author relation
    const post = await prisma.post.create({
      data: {
        content,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: post.id,
        content: post.content,
        author: {
          id: post.author.id,
          username: post.author.username,
          display_name: post.author.displayName,
        },
        likes_count: 0,
        comments_count: 0,
        created_at: post.createdAt.toISOString(),
        updated_at: post.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
