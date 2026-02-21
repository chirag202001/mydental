"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Calendar } from "lucide-react";

interface CsvExportButtonProps {
  /** The server action that returns { csv, filename } */
  exportAction: (params: {
    from?: string;
    to?: string;
  }) => Promise<{ csv: string; filename: string } | { error: string }>;
  label: string;
}

export function CsvExportButton({ exportAction, label }: CsvExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let params: { from?: string; to?: string } = {};
      if (e) {
        const form = new FormData(e.currentTarget);
        const from = form.get("from") as string;
        const to = form.get("to") as string;
        if (from) params.from = from;
        if (to) params.to = to;
      }

      const result = await exportAction(params);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      setShowDates(false);
    } catch {
      setError("Export failed");
    } finally {
      setLoading(false);
    }
  }

  if (!showDates) {
    return (
      <div className="flex gap-1 items-center">
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => handleExport()}
        >
          <Download className="h-4 w-4 mr-1" />
          {loading ? "Exporting…" : label}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowDates(true)}
          title="Export with date range"
        >
          <Calendar className="h-4 w-4" />
        </Button>
        {error && <span className="text-xs text-destructive ml-2">{error}</span>}
      </div>
    );
  }

  return (
    <form onSubmit={handleExport} className="flex gap-2 items-end flex-wrap">
      <div className="space-y-1">
        <Label className="text-xs">From</Label>
        <Input type="date" name="from" className="h-8 text-xs w-36" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">To</Label>
        <Input type="date" name="to" className="h-8 text-xs w-36" />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={loading}>
        <Download className="h-4 w-4 mr-1" />
        {loading ? "…" : "Export"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowDates(false)}
      >
        Cancel
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
