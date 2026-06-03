// ─────────────────────────────────────────────────────────────────────────────
// Hand-rolled SVG chart primitives — full control over the look, zero deps.
// ─────────────────────────────────────────────────────────────────────────────

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";

export const TONE_HEX: Record<Severity, string> = {
  success: "#0d9488",
  info: "#0284c7",
  warning: "#d97706",
  critical: "#e11d48",
};

const safeId = (s: string) => s.replace(/[:]/g, "_");

// ── Score ring ───────────────────────────────────────────────────────────────
export function ScoreRing({
  value,
  size = 76,
  stroke = 7,
  color,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  label?: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-semibold tnum leading-none">
          {label ?? Math.round(value)}
        </span>
        {sublabel && (
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────
export function Sparkline({
  values,
  width = 132,
  height = 38,
  color = TONE_HEX.success,
  fill = true,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  className?: string;
}) {
  const gid = safeId(useId());
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const stepX = (width - pad * 2) / (values.length - 1 || 1);
  const pts = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  return (
    <svg width={width} height={height} className={className}>
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#spark-${gid})`} stroke="none" />}
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.6} fill={color} />
    </svg>
  );
}

// ── Line chart ───────────────────────────────────────────────────────────────
export function LineChart({
  points,
  height = 190,
  color = TONE_HEX.success,
  yMax = 100,
  yUnit = "",
  showArea = true,
}: {
  points: { label: string; value: number }[];
  height?: number;
  color?: string;
  yMax?: number;
  yUnit?: string;
  showArea?: boolean;
}) {
  const gid = safeId(useId());
  const W = 640;
  const H = height;
  const padL = 34;
  const padB = 26;
  const padT = 12;
  const padR = 10;
  const innerW = W - padL - padR;
  const innerH = H - padB - padT;
  const n = points.length;
  const stepX = innerW / (n - 1 || 1);
  const xy = points.map((p, i) => {
    const x = padL + i * stepX;
    const y = padT + (1 - p.value / yMax) * innerH;
    return [x, y] as const;
  });
  const line = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${padT + innerH} L${xy[0][0].toFixed(1)},${padT + innerH} Z`;
  const gridVals = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.ceil(n / 7);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {gridVals.map((g, i) => {
        const y = padT + (1 - g) * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} className="stroke-border" strokeWidth={1} strokeDasharray={i === 0 ? "0" : "3 4"} />
            <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 10 }}>
              {Math.round(g * yMax)}
              {yUnit}
            </text>
          </g>
        );
      })}
      {showArea && <path d={area} fill={`url(#area-${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {xy.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.6} fill="white" stroke={color} strokeWidth={2} />
      ))}
      {points.map((p, i) =>
        i % labelEvery === 0 || i === n - 1 ? (
          <text key={i} x={padL + i * stepX} y={H - 8} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

// ── Vertical bars ────────────────────────────────────────────────────────────
export function BarChart({
  data,
  height = 190,
  yMax = 100,
  yUnit = "",
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  yMax?: number;
  yUnit?: string;
}) {
  const W = 640;
  const H = height;
  const padL = 30;
  const padB = 26;
  const padT = 10;
  const padR = 8;
  const innerW = W - padL - padR;
  const innerH = H - padB - padT;
  const n = data.length;
  const slot = innerW / n;
  const bw = Math.min(34, slot * 0.62);
  const gridVals = [0, 0.5, 1];
  const labelEvery = Math.ceil(n / 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {gridVals.map((g, i) => {
        const y = padT + (1 - g) * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} className="stroke-border" strokeWidth={1} strokeDasharray={i === 0 ? "0" : "3 4"} />
            <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 10 }}>
              {Math.round(g * yMax)}
              {yUnit}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = padL + i * slot + (slot - bw) / 2;
        const h = (d.value / yMax) * innerH;
        const y = padT + innerH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={Math.max(0, h)} rx={3} fill={d.color ?? TONE_HEX.success} opacity={0.9} />
            {(i % labelEvery === 0 || i === n - 1) && (
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut ────────────────────────────────────────────────────────────────────
export function Donut({
  segments,
  size = 132,
  stroke = 16,
  children,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * c;
          const seg = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              stroke={s.color}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-acc}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          );
          acc += dash;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

// ── Horizontal meter ─────────────────────────────────────────────────────────
export function Meter({
  value,
  max = 100,
  color = TONE_HEX.success,
  className,
  height = 8,
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  height?: number;
}) {
  const w = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-muted", className)} style={{ height }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${w}%`, backgroundColor: color, transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)" }}
      />
    </div>
  );
}
