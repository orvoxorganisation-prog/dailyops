import { CalendarCheck, Gauge, ShieldCheck, Target } from "lucide-react";
import { LogoMark, Logo } from "@/components/brand";

const FEATURES = [
  { icon: CalendarCheck, title: "SOP-enforced daily reports", desc: "Six required questions, proof of work, no empty fields." },
  { icon: Gauge, title: "Live productivity scoring", desc: "Reporting, tasks, goals, blockers and compliance in one score." },
  { icon: Target, title: "Real visibility for admins", desc: "Know what shipped, what's blocked, and what's at risk by 6pm." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="grid-dots pointer-events-none absolute inset-0 opacity-[0.07]" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex items-center gap-2.5">
          <LogoMark className="h-9 w-9 bg-primary-foreground/15" />
          <span className="font-display text-lg font-semibold">DailyOps</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-[2.5rem] font-semibold leading-[1.1] tracking-tight">
            Run your company&apos;s day, on the record.
          </h1>
          <p className="mt-4 text-base text-primary-foreground/70">
            The daily operating system for teams — reports, tasks, goals and accountability, in one place.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <f.icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-primary-foreground/65">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-sm text-primary-foreground/60">
          <ShieldCheck className="h-4 w-4" />
          Secure authentication powered by Auth.js
        </div>
      </div>

      {/* Form area */}
      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
