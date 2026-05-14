"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createReport } from "@/app/actions/inventory";

export function CreateReportForm({ defaultClosing }: { defaultClosing: string }) {
  const router = useRouter();
  const [date, setDate] = useState(defaultClosing);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const shouldCopyPrevious = confirm("前月のレポートをコピーしますか？");
          const r = await createReport(date, shouldCopyPrevious);
          if (r.ok) router.push(`/reports/${r.id}`);
          else setError(r.error);
        });
      }}
    >
      <div>
        <label htmlFor="closing" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          締め日（20日締め）
        </label>
        <input
          id="closing"
          type="date"
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        新規レポート
      </button>
      {error ? <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </form>
  );
}
