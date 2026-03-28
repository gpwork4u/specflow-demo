import { NextResponse } from "next/server";
import { buildClearTokenCookie } from "@/lib/auth";

export async function POST() {
  // Clear the JWT cookie by setting Max-Age=0
  const clearCookie = buildClearTokenCookie();

  return NextResponse.json(
    { message: "Logged out successfully" },
    {
      status: 200,
      headers: {
        "Set-Cookie": clearCookie,
      },
    }
  );
}
