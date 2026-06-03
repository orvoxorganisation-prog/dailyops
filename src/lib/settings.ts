import "server-only";
import { prisma } from "./db";

const SETTINGS_ID = "company";

export async function getSettings() {
  return prisma.companySettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID, name: "Your Company" },
  });
}
