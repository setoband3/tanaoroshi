import Link from "next/link";
import { listReports, suggestNextClosingIso } from "@/app/actions/inventory";
import { CreateReportForm } from "@/components/CreateReportForm";
import { DeleteReportButton } from "@/components/DeleteReportButton";
import { formatClosingLabel, formatPeriodRange, parseLocalDate } from "@/lib/period";

export default async function Home() {
  const [reports, defaultClosing] = await Promise.all([listReports(), suggestNextClosingIso()]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">棚卸し一覧</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            20日締めごとにレポートを分けて保存します。前月の提出用データを残したまま、翌月分の入力を並行して進められます。単価・行合計は
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">税抜き</strong>
            です。
          </p>
        </div>

        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">新規作成</h2>
          <CreateReportForm defaultClosing={defaultClosing} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">保存済みレポート</h2>
          {reports.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              まだレポートがありません。上のフォームから締め日を選んで作成してください。
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {reports.map((r) => {
                const closing = parseLocalDate(r.closingDate.toISOString().slice(0, 10));
                const start = parseLocalDate(r.periodStart.toISOString().slice(0, 10));
                const end = parseLocalDate(r.periodEnd.toISOString().slice(0, 10));
                return (
                  <li
                    key={r.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {formatClosingLabel(closing)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{formatPeriodRange(start, end)}</p>
                      <p className="mt-2 text-xs text-zinc-500">明細 {r._count.lines} 行</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/reports/${r.id}`}
                        className="inline-flex flex-1 items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                      >
                        開く
                      </Link>
                      <DeleteReportButton id={r.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
  );
}
