import { notFound } from "next/navigation";
import { getReport } from "@/app/actions/inventory";
import { formatPeriodRange, parseLocalDate } from "@/lib/period";

/** Prisma 利用のためビルド時の静的プリレンダーを行わない */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ReportPrintPage(props: Props) {
  const { id } = await props.params;
  const report = await getReport(id);
  if (!report) notFound();

  const closing = parseLocalDate(report.closingDate.toISOString().slice(0, 10));
  const start = parseLocalDate(report.periodStart.toISOString().slice(0, 10));
  const end = parseLocalDate(report.periodEnd.toISOString().slice(0, 10));
  const closingLabel = `${closing.getFullYear()}年${closing.getMonth() + 1}月${closing.getDate()}日締め`;
  const periodLabel = formatPeriodRange(start, end);
  const total = report.lines.reduce((acc, l) => acc + Number(l.amount.toString()), 0);
  const groupSymbols = ["●", "■", "▲", "◆", "★", "◎", "○", "△", "◇", "□"];
  const uniqueGroupColors = Array.from(
    new Set(report.lines.map((line) => line.groupColor).filter((v): v is string => Boolean(v))),
  );
  const groupMetaByColor = new Map(
    uniqueGroupColors.map((color, idx) => [
      color,
      {
        symbol: groupSymbols[idx % groupSymbols.length],
        label: `グループ${idx + 1}`,
      },
    ]),
  );

  return (
    <main className="mx-auto max-w-[210mm] bg-white px-6 py-6 text-black print:px-4 print:py-4">
      <header className="mb-4 border-b border-zinc-300 pb-3">
        <h1 className="text-xl font-bold">棚卸しレポート</h1>
        <p className="mt-1 text-sm">{closingLabel}</p>
        <p className="text-sm">{periodLabel}</p>
        {uniqueGroupColors.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {uniqueGroupColors.map((color) => {
              const meta = groupMetaByColor.get(color);
              if (!meta) return null;
              return (
                <span key={color} className="inline-flex items-center gap-1 rounded border border-zinc-400 px-2 py-0.5">
                  <span>{meta.symbol}</span>
                  <span>{meta.label}</span>
                </span>
              );
            })}
          </div>
        ) : null}
      </header>

      <section>
        <table className="w-full border-collapse text-[11px] leading-tight">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border border-zinc-400 px-1 py-1 text-left">グループ印</th>
              <th className="border border-zinc-400 px-1 py-1 text-left">品名</th>
              <th className="border border-zinc-400 px-1 py-1 text-left">規格</th>
              <th className="border border-zinc-400 px-1 py-1 text-right">数量</th>
              <th className="border border-zinc-400 px-1 py-1 text-left">単位</th>
              <th className="border border-zinc-400 px-1 py-1 text-right">単価（税抜）</th>
              <th className="border border-zinc-400 px-1 py-1 text-right">合計（税抜）</th>
              <th className="border border-zinc-400 px-1 py-1 text-left">備考</th>
            </tr>
          </thead>
          <tbody>
            {report.lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-zinc-400 px-2 py-4 text-center text-zinc-500">
                  明細はありません
                </td>
              </tr>
            ) : (
              report.lines.map((line) => {
                const meta = line.groupColor ? groupMetaByColor.get(line.groupColor) : null;
                return (
                <tr key={line.id} style={line.groupColor ? { backgroundColor: `${line.groupColor}22` } : undefined}>
                  <td className="border border-zinc-300 px-1 py-1">{meta?.symbol ?? ""}</td>
                  <td className="border border-zinc-300 px-1 py-1">{line.productName}</td>
                  <td className="border border-zinc-300 px-1 py-1">{line.specification}</td>
                  <td className="border border-zinc-300 px-1 py-1 text-right">{line.quantity.toString()}</td>
                  <td className="border border-zinc-300 px-1 py-1">{line.unit}</td>
                  <td className="border border-zinc-300 px-1 py-1 text-right">{line.unitPrice.toString()}</td>
                  <td className="border border-zinc-300 px-1 py-1 text-right">{line.amount.toString()}</td>
                  <td className="border border-zinc-300 px-1 py-1">{line.remarks}</td>
                </tr>
              )})
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="border border-zinc-400 px-1 py-1 text-right font-semibold">
                合計（税抜）
              </td>
              <td className="border border-zinc-400 px-1 py-1 text-right font-semibold">
                {total.toLocaleString("ja-JP")}
              </td>
              <td className="border border-zinc-400 px-1 py-1" />
            </tr>
          </tfoot>
        </table>
      </section>

      <p className="mt-3 text-xs text-zinc-600 print:hidden">
        この画面でブラウザの印刷を開き、「送信先: PDFに保存」「用紙: A4」「向き: 縦」で出力してください。
      </p>
    </main>
  );
}
