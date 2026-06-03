"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { resetPasswordAction, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormSuccess } from "./FormError";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});

  if (!token) {
    return (
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Invalid reset link</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">This link is missing its token. Request a new one.</p>
        <Button asChild className="mt-5 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">Choose a new password</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Enter a new password for your account.</p>

      <FormError message={state.error} className="mt-5" />
      {state.ok ? (
        <>
          <FormSuccess message={state.message} className="mt-5" />
          <Button asChild className="mt-4 w-full">
            <Link href="/login">Continue to sign in</Link>
          </Button>
        </>
      ) : (
        <form action={action} className="mt-5 space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <Label htmlFor="password" className="mb-1.5 block text-sm">New password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      )}
    </div>
  );
}
