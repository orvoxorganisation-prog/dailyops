"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as emp from "@/lib/actions/employee";
import * as adm from "@/lib/actions/admin";

type Res = { ok: true } | { ok: false; error: string };

export function useActions() {
  const router = useRouter();

  async function run(p: Promise<Res>, okMsg?: string, okDesc?: string): Promise<Res> {
    let res: Res;
    try {
      res = await p;
    } catch {
      toast.error("Something went wrong. Please try again.");
      return { ok: false, error: "error" };
    }
    if (!res.ok) {
      toast.error(res.error);
      return res;
    }
    if (okMsg) toast.success(okMsg, okDesc ? { description: okDesc } : undefined);
    router.refresh();
    return res;
  }

  return {
    // tasks
    addTask: (input: unknown) => run(emp.createTaskAction(input), "Task created"),
    updateTask: (id: string, input: unknown) => run(emp.updateTaskAction(id, input), "Task updated"),
    updateTaskStatus: (id: string, status: string) => run(emp.updateTaskStatusAction(id, status)),
    addProgressNote: (id: string, text: string) => run(emp.addProgressNoteAction(id, text), "Progress note added"),
    deleteTask: (id: string) => run(emp.deleteTaskAction(id), "Task deleted"),
    // goals
    createGoal: (input: unknown) => run(emp.createGoalAction(input), "Goal created"),
    adjustGoal: (id: string, delta: number) => run(emp.adjustGoalAction(id, delta)),
    // proof
    addProof: (input: unknown) => run(emp.addProofAction(input), "Proof added to library"),
    removeProof: (id: string) => run(emp.removeProofAction(id), "Proof removed"),
    // notifications
    markRead: (id: string) => emp.markNotificationReadAction(id).then(() => router.refresh()),
    markAllRead: () => emp.markAllNotificationsReadAction().then(() => router.refresh()),
    // admin: review
    nudge: (id: string, name?: string) => run(adm.nudgeAction(id), name ? `Nudge sent to ${name.split(" ")[0]}` : "Nudge sent"),
    toggleFlag: (id: string, flag: boolean, reason?: string) =>
      run(adm.toggleFlagReportAction(id, flag, reason), flag ? "Report flagged for SOP review" : "Flag cleared"),
    runDailyCheck: async () => {
      const res = await adm.runDailyCheckAction();
      if (res.ok) {
        toast.success("Daily check complete", { description: `${res.created} alert${res.created === 1 ? "" : "s"} routed to admins.` });
        router.refresh();
      } else toast.error(res.error);
      return res;
    },
    // admin: user management
    updateUser: (id: string, input: unknown) => run(adm.updateUserAction(id, input), "User updated"),
    setUserRole: (id: string, role: "admin" | "employee") => run(adm.setUserRoleAction(id, role), "Role updated"),
    setUserActive: (id: string, active: boolean) => run(adm.setUserActiveAction(id, active), active ? "User reactivated" : "User disabled"),
    deleteUser: (id: string) => run(adm.deleteUserAction(id), "User deleted"),
    updateSettings: (input: unknown) => run(adm.updateSettingsAction(input), "Settings saved"),
  };
}
