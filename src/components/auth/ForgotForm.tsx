"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { requestResetAction, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormSuccess } from "./FormError";

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestResetAction, {});

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">Reset your password</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a link to reset it.
      </p>

      <FormError message={state.error} className="mt-5" />
      {state.ok && <FormSuccess message={state.message} className="mt-5" />}

      {state.devLink && (
        <div className="mt-3 rounded-lg border bg-muted/50 p-3 text-xs">
          <p className="mb-1 font-medium text-muted-foreground">Dev mode — no email provider configured:</p>
          <Link href={state.devLink} className="break-all text-primary hover:underline">
            {state.devLink}
          </Link>
        </div>
      )}

      <form action={action} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="email" className="mb-1.5 block text-sm">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
