import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateCreatePostInput,
  validateListPostsQuery,
} from "@/lib/validations";

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
 * GET /api/v1/posts - List posts with cursor-based pagination (public).
 */
export async function GET(request: NextRequest) {
  try {
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

    // Build where clause: exclude soft-deleted posts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { deletedAt: null };

    // If cursor is provided, find the cursor post's createdAt for pagination
    if (cursor) {
      const cursorPost = await prisma.post.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });

      if (!cursorPost) {
        // Cursor points to non-existent post: return empty results
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
    console.error("List posts error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

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
        author: { select: authorSelect },
      },
    });

    return NextResponse.json(formatPost(post), { status: 201 });
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
