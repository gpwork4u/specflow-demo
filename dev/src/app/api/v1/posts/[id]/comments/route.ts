import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateCreateCommentInput,
  validateListCommentsQuery,
} from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
};

/**
 * POST /api/v1/posts/:id/comments - Create a comment on a post.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;

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

    // Check if the post exists and is not soft-deleted
    const post = await prisma.post.findUnique({
      where: { id: postId },
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
    const validation = validateCreateCommentInput(body);
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

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: userId,
        postId,
      },
      include: {
        author: { select: authorSelect },
      },
    });

    return NextResponse.json(
      {
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author.id,
          username: comment.author.username,
          display_name: comment.author.displayName,
        },
        post_id: comment.postId,
        created_at: comment.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create comment error:", error);
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
 * GET /api/v1/posts/:id/comments - List comments for a post (public, paginated).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;

    // Check if the post exists and is not soft-deleted
    const post = await prisma.post.findUnique({
      where: { id: postId },
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

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryParams = {
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    };

    const validation = validateListCommentsQuery(queryParams);
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

    // Build where clause: only non-deleted comments for this post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { postId, deletedAt: null };

    // Cursor-based pagination: get comments after the cursor's createdAt
    if (cursor) {
      const cursorComment = await prisma.comment.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });

      if (cursorComment) {
        where.createdAt = { gt: cursorComment.createdAt };
      } else {
        // Cursor points to non-existent comment: return empty results
        return NextResponse.json({
          data: [],
          next_cursor: null,
          has_more: false,
        });
      }
    }

    // Fetch one extra to determine has_more; sort by created_at ASC
    const comments = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      include: {
        author: { select: authorSelect },
      },
    });

    const hasMore = comments.length > limit;
    const resultComments = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor =
      hasMore && resultComments.length > 0
        ? resultComments[resultComments.length - 1].id
        : null;

    return NextResponse.json({
      data: resultComments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author.id,
          username: comment.author.username,
          display_name: comment.author.displayName,
        },
        created_at: comment.createdAt.toISOString(),
      })),
      next_cursor: nextCursor,
      has_more: hasMore,
    });
  } catch (error) {
    console.error("List comments error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
