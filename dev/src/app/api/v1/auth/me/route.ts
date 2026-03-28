import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // User ID is injected by middleware via x-user-id header
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

    // Query user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          code: "UNAUTHORIZED",
          message: "User not found",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.displayName,
      bio: user.bio,
      created_at: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
