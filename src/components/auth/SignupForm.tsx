"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LoaderCircle, ShieldCheck, User } from "lucide-react";
import { signupAction, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FormError } from "./FormError";

const ROLES = [
  { value: "employee", label: "Employee", desc: "Submit reports, manage tasks", icon: User },
  { value: "admin", label: "Admin", desc: "Full company access & analytics", icon: ShieldCheck },
] as const;

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signupAction, {});
  const [role, setRole] = useState<"employee" | "admin">("employee");

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">Create your account</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Join your company&apos;s DailyOps workspace.</p>

      <FormError message={state.error} className="mt-5" />

      <form action={action} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="name" className="mb-1.5 block text-sm">Full name</Label>
          <Input id="name" name="name" autoComplete="name" placeholder="Alex Morgan" required />
        </div>
        <div>
          <Label htmlFor="email" className="mb-1.5 block text-sm">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
        </div>
        <div>
          <Label htmlFor="password" className="mb-1.5 block text-sm">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Role</Label>
          <input type="hidden" name="role" value={role} />
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r.value}
                onClick={() => setRole(r.value)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                  role === r.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"
                )}
              >
                <r.icon className={cn("h-4 w-4", role === r.value ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
