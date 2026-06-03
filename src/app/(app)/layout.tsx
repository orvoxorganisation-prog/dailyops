import { requireAuth } from "@/lib/rbac";
import { listNotifications } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { todayISO } from "@/lib/format";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const [notifications, settings] = await Promise.all([listNotifications(user), getSettings()]);

  let missingReportToday = false;
  if (user.role === "employee") {
    const today = new Date(`${todayISO()}T00:00:00.000Z`);
    const r = await prisma.dailyReport.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
      select: { id: true },
    });
    missingReportToday = !r;
  }

  return (
    <AppShell
      user={user}
      notifications={notifications}
      companyName={settings.name}
      missingReportToday={missingReportToday}
    >
      {children}
    </AppShell>
  );
}
