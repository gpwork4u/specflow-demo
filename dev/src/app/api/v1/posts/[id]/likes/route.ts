import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/posts/:id/likes - Like a post.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
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

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existingLike) {
      return NextResponse.json(
        {
          code: "ALREADY_LIKED",
          message: "You have already liked this post",
        },
        { status: 409 }
      );
    }

    // Create like
    await prisma.like.create({
      data: { userId, postId },
    });

    // Get updated likes count
    const likesCount = await prisma.like.count({
      where: { postId },
    });

    return NextResponse.json(
      {
        post_id: postId,
        likes_count: likesCount,
        is_liked: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Like post error:", error);
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
 * DELETE /api/v1/posts/:id/likes - Unlike a post.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
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

    // Check if the like exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (!existingLike) {
      return NextResponse.json(
        {
          code: "NOT_LIKED",
          message: "You have not liked this post",
        },
        { status: 409 }
      );
    }

    // Delete like
    await prisma.like.delete({
      where: {
        userId_postId: { userId, postId },
      },
    });

    // Get updated likes count
    const likesCount = await prisma.like.count({
      where: { postId },
    });

    return NextResponse.json({
      post_id: postId,
      likes_count: likesCount,
      is_liked: false,
    });
  } catch (error) {
    console.error("Unlike post error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
