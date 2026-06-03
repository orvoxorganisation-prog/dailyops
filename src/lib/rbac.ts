import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "./db";
import { serializeUser } from "./serialize";
import type { User } from "./types";

/** Resolve the current user from the session AND re-check DB status, so disabled
 *  or soft-deleted users lose access immediately on their next request. */
export async function getSessionUser(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser || !dbUser.active || dbUser.deletedAt) return null;
  return serializeUser(dbUser);
}

export async function requireAuth(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export async function requireEmployee(): Promise<User> {
  const user = await requireAuth();
  if (user.role === "admin") redirect("/company");
  return user;
}

// ── Action guards (throw instead of redirect) ────────────────────────────────
export async function currentUserOrThrow(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated.");
  return user;
}

export async function adminOrThrow(): Promise<User> {
  const user = await currentUserOrThrow();
  if (user.role !== "admin") throw new Error("Admin access required.");
  return user;
}
