import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prisma } from "./lib/db";
import { verifyPassword } from "./lib/password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.union([z.string(), z.boolean()]).optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "checkbox" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, remember } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        // Reject unknown, soft-deleted, or disabled accounts (access lost immediately).
        if (!user || !user.active || user.deletedAt) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.toLowerCase(),
          active: user.active,
          remember: remember === "true" || remember === true || remember === "on",
        };
      },
    }),
  ],
});
