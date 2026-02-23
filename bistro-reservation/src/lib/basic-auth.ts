import { NextRequest, NextResponse } from "next/server";

export function parseBasicAuthHeader(header: string | null) {
  if (!header || !header.startsWith("Basic ")) return null;
  const base64 = header.replace("Basic ", "");
  const decoded = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");
  return { user, pass };
}

export function isAuthorized(request: NextRequest) {
  const creds = parseBasicAuthHeader(request.headers.get("authorization"));
  if (!creds) return false;
  const expectedUser = process.env.ADMIN_BASIC_USER;
  const expectedPass = process.env.ADMIN_BASIC_PASS;
  if (!expectedUser || !expectedPass) return false;
  return creds.user === expectedUser && creds.pass === expectedPass;
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
