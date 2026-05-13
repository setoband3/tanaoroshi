import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport } from "@/app/actions/inventory";
import { ReportEditor } from "@/components/ReportEditor";
import { formatPeriodRange, parseLocalDate } from "@/lib/period";
import { reportToSerialized } from "@/lib/serialize-report";

type Props = { params: Promise<{ id: string }> };

export default async function ReportPage(props: Props) {
  const { id } = await props.params;
  const report = await getReport(id);
  if (!report) notFound();

  const serialized = reportToSerialized(report);

  const periodShort = formatPeriodRange(
    parseLocalDate(serialized.periodStart.slice(0, 10)),
    parseLocalDate(serialized.periodEnd.slice(0, 10)),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
          一覧
        </Link>
        <span className="mx-2">/</span>
        <span>{periodShort}</span>
      </p>
      <ReportEditor report={serialized} />
    </div>
  );
}
