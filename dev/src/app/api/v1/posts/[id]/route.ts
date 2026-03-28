import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateUpdatePostInput } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/posts/:id — Edit a post (author only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check authentication
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

    // Find the post
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post || post.deletedAt !== null) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Post not found",
        },
        { status: 404 }
      );
    }

    // Check ownership
    if (post.authorId !== userId) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "You can only edit your own posts",
        },
        { status: 403 }
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
    const validation = validateUpdatePostInput(body);
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

    // Update the post
    const updatedPost = await prisma.post.update({
      where: { id },
      data: { content },
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

    return NextResponse.json({
      id: updatedPost.id,
      content: updatedPost.content,
      author: {
        id: updatedPost.author.id,
        username: updatedPost.author.username,
        display_name: updatedPost.author.displayName,
      },
      likes_count: 0,
      comments_count: 0,
      created_at: updatedPost.createdAt.toISOString(),
      updated_at: updatedPost.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Edit post error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/posts/:id — Soft delete a post (author only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check authentication
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

    // Find the post
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post || post.deletedAt !== null) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Post not found",
        },
        { status: 404 }
      );
    }

    // Check ownership
    if (post.authorId !== userId) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "You can only delete your own posts",
        },
        { status: 403 }
      );
    }

    // Soft delete
    await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
