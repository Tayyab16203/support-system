/**
 * Next.js middleware for route protection.
 *
 * NOTE: Amplify (v6) stores Cognito tokens in localStorage on the client,
 * which middleware (running on the edge/server) cannot read. So client-side
 * route guarding is handled by the (protected) layout via useAuth.
 *
 * This middleware is kept as a lightweight pass-through and a place to add
 * cookie-based checks later if we switch Amplify to cookie storage.
 */

import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};