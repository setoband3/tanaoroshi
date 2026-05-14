"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addLine,
  deleteLine,
  importReportCsv,
  updateLine,
  updateReportMemo,
  type LineUpdatePayload,
} from "@/app/actions/inventory";
import { GROUP_COLOR_PRESETS } from "@/lib/group-colors";
import { formatMoney, lineAmountExTax, parseMoneyInput, parseQuantityInput } from "@/lib/money";
import { formatPeriodRange, parseLocalDate } from "@/lib/period";
import type { SerializedLine, SerializedReport } from "@/lib/serialize-report";

function rowTintStyle(groupColor: string | null): CSSProperties {
  if (!groupColor) return {};
  return {
    backgroundColor: `${groupColor}55`,
    boxShadow: `inset 4px 0 0 0 ${groupColor}`,
  };
}

function LineRow({
  line,
  reportId,
}: {
  line: SerializedLine;
  reportId: string;
}) {
  const router = useRouter();
  const [productName, setProductName] = useState(line.productName);
  const [specification, setSpecification] = useState(line.specification);
  const [quantity, setQuantity] = useState(line.quantity);
  const [unit, setUnit] = useState(line.unit);
  const [unitPrice, setUnitPrice] = useState(line.unitPrice);
  const [remarks, setRemarks] = useState(line.remarks);
  const [groupColor, setGroupColor] = useState<string | null>(line.groupColor);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setProductName(line.productName);
    setSpecification(line.specification);
    setQuantity(line.quantity);
    setUnit(line.unit);
    setUnitPrice(line.unitPrice);
    setRemarks(line.remarks);
    setGroupColor(line.groupColor);
  }, [line]);

  const flush = (patch: LineUpdatePayload) => {
    startTransition(async () => {
      await updateLine(line.id, reportId, patch);
      router.refresh();
    });
  };

  return (
    <tr className="border-b border-zinc-200" style={rowTintStyle(groupColor)}>
      <td className="p-1 align-top">
        <select
          className="w-full max-w-[7rem] rounded border border-zinc-300 bg-white px-1 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={groupColor ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? null : e.target.value;
            setGroupColor(v);
            flush({ groupColor: v });
          }}
          aria-label="行グループ色"
        >
          {GROUP_COLOR_PRESETS.map((p) => (
            <option key={p.label} value={p.value ?? ""}>
              {p.label}
            </option>
          ))}
        </select>
      </td>
      <td className="p-1 align-top">
        <input
          className="w-full min-w-[10rem] rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          onBlur={() => {
            if (productName !== line.productName) flush({ productName });
          }}
          placeholder="品名"
        />
      </td>
      <td className="p-1 align-top">
        <input
          className="w-full min-w-[8rem] rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={specification}
          onChange={(e) => setSpecification(e.target.value)}
          onBlur={() => {
            if (specification !== line.specification) flush({ specification });
          }}
          placeholder="規格"
        />
      </td>
      <td className="p-1 align-top text-right">
        <input
          inputMode="decimal"
          className="w-[3.2rem] min-w-0 rounded border border-zinc-300 px-1 py-1.5 text-right text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={() => {
            if (quantity !== line.quantity) flush({ quantity });
          }}
          placeholder="0"
        />
      </td>
      <td className="p-1 align-top">
        <input
          className="w-[4.2rem] min-w-0 rounded border border-zinc-300 px-1 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          onBlur={() => {
            if (unit !== line.unit) flush({ unit });
          }}
          placeholder="棟・台など"
        />
      </td>
      <td className="p-1 align-top text-right">
        <input
          inputMode="numeric"
          className="w-[2.8rem] min-w-0 rounded border border-zinc-300 px-1.5 py-1.5 text-right text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          onBlur={() => {
            if (unitPrice !== line.unitPrice) flush({ unitPrice });
          }}
          placeholder="税抜"
        />
      </td>
      <td className="p-1 align-top text-right tabular-nums text-zinc-800 dark:text-zinc-200">
        <span className="inline-block min-w-[5rem] rounded border border-transparent bg-zinc-100 px-2 py-1.5 text-sm dark:bg-zinc-800">
          {formatMoney(lineAmountExTax(parseQuantityInput(quantity), parseMoneyInput(unitPrice)))}
        </span>
      </td>
      <td className="p-1 align-top">
        <textarea
          className="w-full min-w-[12rem] resize-y rounded border border-zinc-300 px-2 py-1.5 text-sm leading-snug dark:border-zinc-600 dark:bg-zinc-900"
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          onBlur={() => {
            if (remarks !== line.remarks) flush({ remarks });
          }}
          placeholder="仕入・販売・自社使用など"
        />
      </td>
      <td className="p-1 align-top">
        <button
          type="button"
          className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
          disabled={isPending}
          onClick={() => {
            if (!confirm("この行を削除しますか？")) return;
            startTransition(async () => {
              await deleteLine(line.id, reportId);
              router.refresh();
            });
          }}
        >
          削除
        </button>
      </td>
    </tr>
  );
}

export function ReportEditor({ report }: { report: SerializedReport }) {
  const router = useRouter();
  const [memo, setMemo] = useState(report.memo);
  const [importError, setImportError] = useState<string | null>(null);
  const memoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (memoTimer.current) clearTimeout(memoTimer.current);
    };
  }, []);

  useEffect(() => {
    setMemo(report.memo);
  }, [report.memo]);

  const periodLabel = useMemo(() => {
    const a = parseLocalDate(report.periodStart.slice(0, 10));
    const b = parseLocalDate(report.periodEnd.slice(0, 10));
    return formatPeriodRange(a, b);
  }, [report.periodStart, report.periodEnd]);

  const closingLabel = useMemo(() => {
    const d = parseLocalDate(report.closingDate.slice(0, 10));
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日締め`;
  }, [report.closingDate]);

  const total = useMemo(() => {
    return report.lines.reduce((acc, l) => acc + Number(l.amount.replace(/,/g, "") || 0), 0);
  }, [report.lines]);

  const onMemoChange = (v: string) => {
    setMemo(v);
    if (memoTimer.current) clearTimeout(memoTimer.current);
    memoTimer.current = setTimeout(() => {
      startTransition(async () => {
        await updateReportMemo(report.id, v);
        router.refresh();
      });
    }, 700);
  };

  const exportCsv = () => {
    const header = ["グループ色", "品名", "規格", "数量", "単位", "単価(税抜)", "合計(税抜)", "備考"];
    const rows = report.lines.map((l) => {
      const color = l.groupColor ?? "";
      return [color, l.productName, l.specification, l.quantity, l.unit, l.unitPrice, l.amount, l.remarks]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });
    const bom = "\uFEFF";
    const body = [header.join(","), ...rows].join("\n");
    const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `棚卸し_${closingLabel.replace(/[^\d年月日締め]/g, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadImportTemplate = () => {
    const header = ["グループ色", "品名", "規格", "数量", "単位", "単価(税抜)", "備考"];
    const sample = ["#A7F3D0", "例）養生シート", "2m×50m", "3", "本", "1200", "必要ならメモ"];
    const bom = "\uFEFF";
    const body = [
      header.join(","),
      sample.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    ].join("\n");
    const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "棚卸し_取込テンプレート.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportCsvFile = async (file: File | null) => {
    if (!file) return;
    setImportError(null);
    const text = await file.text();
    startTransition(async () => {
      const result = await importReportCsv(report.id, text);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">対象期間（21日始まり〜翌月20日締め）</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {periodLabel}
          </h1>
          <p className="mt-1 text-lg text-zinc-700 dark:text-zinc-300">{closingLabel}</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            単価・合計はいずれも<strong className="font-medium">税抜き</strong>です。合計は数量×単価で自動計算されます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            onClick={downloadImportTemplate}
          >
            取込テンプレートCSV
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            CSV取込
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              void onImportCsvFile(file);
            }}
          />
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            onClick={exportCsv}
          >
            CSVエクスポート
          </button>
          <button
            type="button"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await addLine(report.id);
                router.refresh();
              });
            }}
          >
            行を追加
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          レポートメモ（提出期限・税理士向けメモなど）
        </label>
        <textarea
          className="w-full max-w-3xl rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          rows={2}
          value={memo}
          onChange={(e) => onMemoChange(e.target.value)}
          onBlur={() => {
            if (memoTimer.current) clearTimeout(memoTimer.current);
            memoTimer.current = undefined;
            if (memo !== report.memo) {
              startTransition(async () => {
                await updateReportMemo(report.id, memo);
                router.refresh();
              });
            }
          }}
          placeholder="例: 5/10 税理士提出予定"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[72rem] border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-100 text-left text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <th className="whitespace-nowrap px-2 py-2 font-medium">グループ</th>
              <th className="min-w-[10rem] px-2 py-2 font-medium">品名</th>
              <th className="min-w-[8rem] px-2 py-2 font-medium">規格</th>
              <th className="w-[3.2rem] px-2 py-2 text-right font-medium">数量</th>
              <th className="w-[4.2rem] px-2 py-2 font-medium">単位</th>
              <th className="w-[2.8rem] px-2 py-2 text-right font-medium">単価（税抜）</th>
              <th className="min-w-[6rem] px-2 py-2 text-right font-medium">合計（税抜）</th>
              <th className="min-w-[12rem] px-2 py-2 font-medium">備考</th>
              <th className="px-2 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {report.lines.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                  行がありません。「行を追加」から入力してください。
                </td>
              </tr>
            ) : (
              report.lines.map((line) => (
                <LineRow key={line.id} line={line} reportId={report.id} />
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50 font-semibold dark:bg-zinc-900">
              <td colSpan={6} className="px-2 py-3 text-right text-zinc-700 dark:text-zinc-300">
                合計（税抜）
              </td>
              <td className="px-2 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                {total.toLocaleString("ja-JP")}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        フィールドからフォーカスを外すと自動保存されます。合計は保存時に数量×単価で再計算されます。関連する明細（本体＋運搬費など）は同じグループ色を選ぶと、左端の帯と背景でひとまとまりに見えます。
      </p>
      {importError ? <p className="text-sm text-red-600 dark:text-red-400">{importError}</p> : null}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        CSV取込は現在の明細をいったん置き換えます。必要なら先にCSVエクスポートしてバックアップしてください。
      </p>
    </div>
  );
}
