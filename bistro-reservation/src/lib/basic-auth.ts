import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export function parseBasicAuthHeader(header: string | null) {
  if (!header || !header.startsWith("Basic ")) return null;
  const base64 = header.replace("Basic ", "");
  const decoded = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");
  return { user, pass };
}

function safeEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    const leftCode = index < left.length ? left.charCodeAt(index) : 0;
    const rightCode = index < right.length ? right.charCodeAt(index) : 0;
    mismatch |= leftCode ^ rightCode;
  }

  return mismatch === 0;
}

export function isAuthorized(request: NextRequest) {
  const creds = parseBasicAuthHeader(request.headers.get("authorization"));
  if (!creds) return false;
  const expectedUser = env.ADMIN_BASIC_USER;
  const expectedPass = env.ADMIN_BASIC_PASS;
  if (!expectedUser || !expectedPass) return false;
  return safeEqual(creds.user ?? "", expectedUser) && safeEqual(creds.pass ?? "", expectedPass);
}

export function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": "Basic realm=\"Restricted\"" },
  });
}

export function requireBasicAuth(request: NextRequest) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }
  return null;
}
