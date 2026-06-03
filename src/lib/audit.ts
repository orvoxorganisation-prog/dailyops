import "server-only";
import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

export async function writeAudit(input: {
  action: string;
  actorId?: string | null;
  targetUserId?: string | null;
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        targetUserId: input.targetUserId ?? null,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  } catch {
    // auditing must never break the primary action
  }
}
