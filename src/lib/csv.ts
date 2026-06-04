// Client-safe CSV helpers for exporting on-screen data for sharing.

type Row = Record<string, unknown>;

export function toCsv(rows: Row[], headers?: string[]): string {
  const cols = headers ?? (rows[0] ? Object.keys(rows[0]) : []);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return body ? `${head}\n${body}` : head;
}

export function downloadCsv(filename: string, rows: Row[], headers?: string[]): void {
  // Prepend a UTF-8 BOM so Excel opens accented characters correctly.
  const blob = new Blob(["﻿" + toCsv(rows, headers)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
