import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/session";
import { SESSION_OPTIONS } from "@/lib/session";

export async function middleware(request: NextRequest) {
  // iron-session needs a Response to write cookies back; for read-only checks
  // we use a dummy response.
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    SESSION_OPTIONS
  );

  if (!session.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
