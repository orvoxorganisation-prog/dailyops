"use client";

import { useRouter } from "next/navigation";
import { Bell, CircleCheckBig, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/employee";
import type { Notification, Severity } from "@/lib/types";

const SEV_ICON: Record<Severity, typeof Info> = {
  success: CircleCheckBig,
  info: Info,
  warning: TriangleAlert,
  critical: OctagonAlert,
};
const SEV_COLOR: Record<Severity, string> = {
  success: "text-teal-600 dark:text-teal-400",
  info: "text-sky-600 dark:text-sky-400",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-rose-600 dark:text-rose-400",
};

export function NotificationCenter({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read).length;

  const onRead = async (id: string) => {
    await markNotificationReadAction(id);
    router.refresh();
  };
  const onReadAll = async () => {
    await markAllNotificationsReadAction();
    router.refresh();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white tnum">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onReadAll}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <ul className="divide-y">
              {notifications.slice(0, 30).map((n) => {
                const Icon = SEV_ICON[n.severity];
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => onRead(n.id)}
                      className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60", !n.read && "bg-accent/40")}
                    >
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", SEV_COLOR[n.severity])} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug">{n.title}</p>
                          {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">{relativeTime(n.createdAt)}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
