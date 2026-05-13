"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteReport } from "@/app/actions/inventory";

export function DeleteReportButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      onClick={() => {
        if (!confirm("このレポートを削除しますか？明細もすべて失われます。")) return;
        startTransition(async () => {
          await deleteReport(id);
          router.refresh();
        });
      }}
    >
      削除
    </button>
  );
}
