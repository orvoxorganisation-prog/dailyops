"use server";

import { createHash, randomBytes } from "crypto";
import { addHours } from "date-fns";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { hueFor } from "@/lib/format";
import { writeAudit } from "@/lib/audit";
import { sendMail } from "@/lib/mail";

export interface FormState {
  error?: string;
  ok?: boolean;
  message?: string;
  devLink?: string;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// ── Signup ───────────────────────────────────────────────────────────────────
const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["admin", "employee"]),
});

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists." };

  // Bootstrap: the very first account is always an Admin so the company always
  // has at least one administrator.
  const userCount = await prisma.user.count();
  const finalRole = userCount === 0 ? "ADMIN" : role === "admin" ? "ADMIN" : "EMPLOYEE";

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: finalRole,
      hue: hueFor(email),
    },
  });
  await writeAudit({
    action: userCount === 0 ? "user.signup.bootstrap_admin" : "user.signup",
    actorId: user.id,
    targetUserId: user.id,
    entity: "User",
    entityId: user.id,
    metadata: { role: finalRole },
  });

  // Establish a session and route to the role's home. signIn throws a redirect.
  await signIn("credentials", {
    email,
    password,
    remember: "true",
    redirectTo: finalRole === "ADMIN" ? "/company" : "/dashboard",
  });
  return { ok: true };
}

// ── Login ────────────────────────────────────────────────────────────────────
export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") ? "true" : "false";
  if (!email || !password) return { error: "Enter your email and password." };

  try {
    await signIn("credentials", { email, password, remember, redirectTo: "/" });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err; // re-throw redirect
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

// ── Password reset request ───────────────────────────────────────────────────
export async function requestResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email." };

  const user = await prisma.user.findUnique({ where: { email } });
  const generic: FormState = {
    ok: true,
    message: "If an account exists for that email, a reset link is on its way.",
  };

  if (!user || !user.active || user.deletedAt) return generic;

  const raw = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha(raw), expiresAt: addHours(new Date(), 1) },
  });
  const base = process.env.AUTH_URL || "http://localhost:3000";
  const link = `${base}/reset-password?token=${raw}`;

  const { delivered } = await sendMail({
    to: email,
    subject: "Reset your DailyOps password",
    text: `Reset your password (valid for 1 hour): ${link}`,
    html: `<p>We received a request to reset your DailyOps password.</p><p><a href="${link}">Reset your password</a> — this link expires in 1 hour.</p><p>If you didn't request this, you can ignore this email.</p>`,
  });

  await writeAudit({ action: "user.password_reset_requested", targetUserId: user.id, entity: "User", entityId: user.id });

  // In dev (no email provider) surface the link so the flow is testable.
  if (!delivered && process.env.NODE_ENV !== "production") {
    return { ...generic, devLink: link };
  }
  return generic;
}

// ── Password reset ───────────────────────────────────────────────────────────
const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid request." };

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha(parsed.data.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  await writeAudit({ action: "user.password_reset", targetUserId: record.userId, entity: "User", entityId: record.userId });

  return { ok: true, message: "Password updated. You can now sign in." };
}
