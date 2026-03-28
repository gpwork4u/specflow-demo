import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/posts/:id - Get a single post by ID (public).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await prisma.post.findUnique({
      where: { id },
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

    // Return 404 if post doesn't exist or is soft-deleted
    if (!post || post.deletedAt !== null) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Post not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: post.id,
      content: post.content,
      author: {
        id: post.author.id,
        username: post.author.username,
        display_name: post.author.displayName,
      },
      likes_count: 0,
      comments_count: 0,
      is_liked: false,
      created_at: post.createdAt.toISOString(),
      updated_at: post.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Get post detail error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
