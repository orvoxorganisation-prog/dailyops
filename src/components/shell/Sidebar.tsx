"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { navFor } from "./nav";

export function SidebarContent({
  role,
  companyName,
  missingReportToday,
  onNavigate,
}: {
  role: Role;
  companyName: string;
  missingReportToday?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navFor(role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo subtitle={companyName} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 scroll-thin">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const showDot = item.href === "/reports" && missingReportToday;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border"
                  : "text-foreground/70 hover:bg-background/60 hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
              )}
              <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-foreground/55")} />
              <span className="flex-1">{item.label}</span>
              {showDot && <span className="h-2 w-2 rounded-full bg-amber-500" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {role === "admin" ? "Admin console" : "Employee workspace"} · DailyOps
        </p>
      </div>
    </div>
  );
}
