"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Power,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, PageHeader, Tag } from "@/components/common";
import { cn } from "@/lib/utils";
import { relativeTime, roleLabel } from "@/lib/format";
import { useActions } from "@/lib/useActions";
import type { AuditEntry, User } from "@/lib/types";

export function UsersAdmin({
  users,
  currentUserId,
  audit,
}: {
  users: User[];
  currentUserId: string;
  audit: AuditEntry[];
}) {
  const { setUserRole, setUserActive, deleteUser } = useActions();
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const visible = users.filter((u) => !u.deleted);
  const deleted = users.filter((u) => u.deleted);
  const admins = visible.filter((u) => u.role === "admin").length;
  const employees = visible.filter((u) => u.role === "employee").length;
  const disabled = visible.filter((u) => !u.active).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage accounts, roles and access for your company." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total" value={visible.length} tone="text-foreground" />
        <Tile label="Admins" value={admins} tone="text-sky-600" />
        <Tile label="Employees" value={employees} tone="text-teal-600" />
        <Tile label="Disabled" value={disabled} tone="text-amber-600" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_2.5rem] items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <span>Member</span>
          <span>Role</span>
          <span>Status</span>
          <span>Last active</span>
          <span />
        </div>
        <ul className="divide-y">
          {[...visible, ...deleted].map((u) => (
            <li key={u.id} className={cn("grid grid-cols-2 items-center gap-3 px-4 py-3 md:grid-cols-[2fr_1fr_1fr_1fr_2.5rem]", u.deleted && "opacity-55")}>
              <div className="flex items-center gap-3">
                <Avatar user={u} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {u.name}
                    {u.id === currentUserId && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="hidden md:block">
                {u.role === "admin" ? <Tag tone="info"><ShieldCheck className="h-3 w-3" /> Admin</Tag> : <Tag tone="success">Employee</Tag>}
              </div>
              <div className="hidden md:block">
                {u.deleted ? <Tag tone="critical">Deleted</Tag> : u.active ? <Tag tone="success">Active</Tag> : <Tag tone="warning">Disabled</Tag>}
              </div>
              <div className="hidden text-xs text-muted-foreground md:block">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : "Never"}</div>
              <div className="flex justify-end">
                {!u.deleted && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => setEditing(u)}><Pencil className="mr-2 h-4 w-4" /> Edit details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setUserRole(u.id, u.role === "admin" ? "employee" : "admin")}>
                        <UserCog className="mr-2 h-4 w-4" /> {u.role === "admin" ? "Make employee" : "Make admin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setUserActive(u.id, !u.active)}>
                        <Power className="mr-2 h-4 w-4" /> {u.active ? "Disable access" : "Reactivate"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(u)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete user
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {audit.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold"><Users className="h-4 w-4 text-muted-foreground" /> Recent activity</h2>
          <ul className="space-y-2">
            {audit.slice(0, 12).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{a.actorName ?? "System"}</span>
                  <span className="text-muted-foreground"> · {a.action.replace(/[._]/g, " ")}</span>
                  {a.targetName && <span className="text-muted-foreground"> → {a.targetName}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && <EditUserDialog user={editing} onClose={() => setEditing(null)} />}
      {confirmDelete && (
        <Dialog open onOpenChange={(v) => !v && setConfirmDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Delete {confirmDelete.name}?</DialogTitle>
              <DialogDescription>
                This is a soft delete. {confirmDelete.name.split(" ")[0]} loses access immediately, but their historical reports, tasks and audit logs are retained.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  const res = await deleteUser(confirmDelete.id);
                  if (res.ok) setConfirmDelete(null);
                }}
              >
                Delete user
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EditUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const { updateUser } = useActions();
  const [name, setName] = useState(user.name);
  const [title, setTitle] = useState(user.title === "Administrator" || user.title === "Team Member" ? "" : user.title);
  const [team, setTeam] = useState(user.team === "Company" ? "" : user.team);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await updateUser(user.id, { name, title, team });
    setBusy(false);
    if (res.ok) onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit {user.name}</DialogTitle>
          <DialogDescription>Update this member&apos;s profile details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-1.5 block text-sm">Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Engineer" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Team</Label>
              <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Engineering" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || !name.trim()}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className={cn("font-display text-2xl font-semibold tnum", tone)}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
