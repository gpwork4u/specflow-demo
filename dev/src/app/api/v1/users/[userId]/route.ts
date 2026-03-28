import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/v1/users/:userId - Get public user profile info.
 *
 * Returns user info WITHOUT email or password_hash (privacy).
 * posts_count excludes soft-deleted posts.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        createdAt: true,
        // Explicitly NOT selecting email or passwordHash
        _count: {
          select: {
            posts: {
              where: { deletedAt: null },
            },
          },
        },
      },
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

    return NextResponse.json({
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      bio: user.bio,
      posts_count: user._count.posts,
      created_at: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
