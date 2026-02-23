import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAuthorized, unauthorized } from "./src/lib/basic-auth";

export function middleware(request: NextRequest) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/api/admin/:path*", "/api/cron/:path*"],
};
