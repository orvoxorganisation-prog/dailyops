import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "employee";
      active: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    active?: boolean;
    remember?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "admin" | "employee";
    active?: boolean;
    remember?: boolean;
    expiresAt?: number;
  }
}
