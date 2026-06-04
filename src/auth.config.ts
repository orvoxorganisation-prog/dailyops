import type { NextAuthConfig } from "next-auth";

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];
const ADMIN_PREFIXES = ["/company", "/summary", "/performance", "/analytics", "/all-reports", "/admin", "/settings"];
const EMPLOYEE_PREFIXES = ["/dashboard", "/reports", "/tasks", "/goals", "/proof", "/leave"];

const homeFor = (role?: string) => (role === "admin" ? "/company" : "/dashboard");

// Edge-safe config shared by the Node auth instance and the middleware instance.
// No Prisma / bcrypt here — those live only in the Credentials provider (auth.ts).
export const authConfig = {
  pages: { signIn: "/login" },
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role as "admin" | "employee") ?? "employee";
        token.active = user.active ?? true;
        token.remember = user.remember ?? false;
        token.expiresAt = Date.now() + (user.remember ? 30 : 1) * 24 * 60 * 60 * 1000;
      }
      return token;
    },
    session({ session, token }) {
      // "Remember me": non-remembered sessions are treated as expired after 1 day.
      const expiresAt = token.expiresAt as number | undefined;
      if (expiresAt && Date.now() > expiresAt) {
        return { ...session, user: undefined as unknown as typeof session.user };
      }
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as "admin" | "employee") ?? "employee";
        session.user.active = (token.active as boolean | undefined) ?? true;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const user = auth?.user;
      const path = nextUrl.pathname;
      const isAuthPage = AUTH_PAGES.some((p) => path.startsWith(p));

      if (!user) return isAuthPage; // unauthenticated: only auth pages allowed → else redirect to /login

      const role = user.role;
      if (isAuthPage || path === "/") {
        return Response.redirect(new URL(homeFor(role), nextUrl));
      }
      if (role === "employee" && ADMIN_PREFIXES.some((p) => path.startsWith(p))) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      if (role === "admin" && EMPLOYEE_PREFIXES.some((p) => path.startsWith(p))) {
        return Response.redirect(new URL("/company", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
