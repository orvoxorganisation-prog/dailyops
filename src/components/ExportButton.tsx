"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";

export function ExportButton({
  filename,
  rows,
  headers,
  label = "Export CSV",
}: {
  filename: string;
  rows: Record<string, unknown>[];
  headers?: string[];
  label?: string;
}) {
  return (
    <Button variant="outline" size="sm" onClick={() => downloadCsv(filename, rows, headers)} disabled={!rows.length}>
      <Download className="mr-1.5 h-4 w-4" /> {label}
    </Button>
  );
}
