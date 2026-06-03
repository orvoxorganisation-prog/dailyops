"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { loginAction, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError } from "./FormError";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  const [remember, setRemember] = useState(true);

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">Sign in to DailyOps</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Welcome back. Enter your credentials to continue.</p>

      <FormError message={state.error} className="mt-5" />

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="remember" value={remember ? "on" : ""} />
        <div>
          <Label htmlFor="email" className="mb-1.5 block text-sm">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password" className="text-sm">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
          Remember me for 30 days
        </label>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to DailyOps?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
