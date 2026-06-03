import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe middleware: only authConfig (no Prisma/bcrypt). Route protection is
// driven by the `authorized` callback.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Run on everything except Next internals, the auth API, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
