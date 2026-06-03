import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive", className)}>
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function FormSuccess({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <div className={cn("rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2.5 text-sm text-teal-700 dark:text-teal-300", className)}>
      {message}
    </div>
  );
}
