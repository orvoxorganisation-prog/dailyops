"use client";

import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { Notification, User } from "@/lib/types";

export function AppShell({
  user,
  notifications,
  companyName,
  missingReportToday,
  children,
}: {
  user: User;
  notifications: Notification[];
  companyName: string;
  missingReportToday: boolean;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-muted/30 lg:block">
        <SidebarContent role={user.role} companyName={companyName} missingReportToday={missingReportToday} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-muted/30 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            role={user.role}
            companyName={companyName}
            missingReportToday={missingReportToday}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar user={user} notifications={notifications} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
