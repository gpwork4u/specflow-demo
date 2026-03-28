import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateListPostsQuery } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * Helper to format a post record into the API response shape.
 */
function formatPost(post: {
  id: string;
  content: string;
  author: { id: string; username: string; displayName: string };
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
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
  };
}

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
};

/**
 * GET /api/v1/users/:userId/posts - List a user's posts with cursor-based pagination (public).
 *
 * Excludes soft-deleted posts. Sorted by created_at DESC.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    };

    const validation = validateListPostsQuery(queryParams);
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

    const { cursor, limit } = validation.data;

    // Build where clause: this user's posts, exclude soft-deleted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { authorId: userId, deletedAt: null };

    // Cursor-based pagination
    if (cursor) {
      const cursorPost = await prisma.post.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });

      if (!cursorPost) {
        return NextResponse.json({
          data: [],
          next_cursor: null,
          has_more: false,
        });
      }

      where.createdAt = { lt: cursorPost.createdAt };
    }

    // Fetch one extra to determine has_more
    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        author: { select: authorSelect },
      },
    });

    const hasMore = posts.length > limit;
    const resultPosts = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor =
      hasMore && resultPosts.length > 0
        ? resultPosts[resultPosts.length - 1].id
        : null;

    return NextResponse.json({
      data: resultPosts.map(formatPost),
      next_cursor: nextCursor,
      has_more: hasMore,
    });
  } catch (error) {
    console.error("List user posts error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
