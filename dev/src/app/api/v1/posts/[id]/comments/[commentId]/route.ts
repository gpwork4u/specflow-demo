import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; commentId: string }>;
}

/**
 * DELETE /api/v1/posts/:id/comments/:commentId - Soft delete a comment.
 * Only the comment author or the post author can delete a comment.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId, commentId } = await params;

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

    // Find the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.deletedAt !== null || comment.postId !== postId) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Comment not found",
        },
        { status: 404 }
      );
    }

    // Check permission: comment author or post author
    if (comment.authorId !== userId && post.authorId !== userId) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "You can only delete your own comments or comments on your posts",
        },
        { status: 403 }
      );
    }

    // Soft delete
    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
