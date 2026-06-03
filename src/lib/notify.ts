import "server-only";
import { prisma } from "./db";
import type { NotificationType, Severity } from "@prisma/client";

export async function notifyUser(opts: {
  recipientId: string;
  audience: "employee" | "admin";
  type: NotificationType;
  title: string;
  message: string;
  severity?: Severity;
  relatedUserId?: string;
}) {
  await prisma.notification.create({
    data: {
      recipientId: opts.recipientId,
      audience: opts.audience,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      severity: opts.severity ?? "INFO",
      relatedUserId: opts.relatedUserId,
    },
  });
}

/** Fan-out a notification to every active admin so all admins see it. */
export async function notifyAdmins(opts: {
  type: NotificationType;
  title: string;
  message: string;
  severity?: Severity;
  relatedUserId?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true, deletedAt: null },
    select: { id: true },
  });
  if (!admins.length) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      recipientId: a.id,
      audience: "admin",
      type: opts.type,
      title: opts.title,
      message: opts.message,
      severity: opts.severity ?? "INFO",
      relatedUserId: opts.relatedUserId,
    })),
  });
}
