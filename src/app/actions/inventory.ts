"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { lineAmountExTax, parseMoneyInput, parseQuantityInput } from "@/lib/money";
import {
  nextClosingAfter,
  parseLocalDate,
  periodRangeForClosing,
} from "@/lib/period";

type ParsedCsvRow = string[];

function parseCsv(text: string): ParsedCsvRow[] {
  const rows: ParsedCsvRow[] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^\uFEFF/, "");

  while (i < normalized.length) {
    const ch = normalized[i];

    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeHeaderName(value: string): string {
  return value.replace(/\s+/g, "").replace(/[（）]/g, "()").trim();
}

function isLineBlank(values: {
  productName: string;
  specification: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  remarks: string;
  groupColor: string | null;
}): boolean {
  return (
    values.productName.trim() === "" &&
    values.specification.trim() === "" &&
    values.quantity.trim() === "" &&
    values.unit.trim() === "" &&
    values.unitPrice.trim() === "" &&
    values.remarks.trim() === "" &&
    (values.groupColor ?? "").trim() === ""
  );
}

export async function listReports() {
  return prisma.inventoryReport.findMany({
    orderBy: { closingDate: "desc" },
    include: {
      _count: { select: { lines: true } },
    },
  });
}

export async function getReport(id: string) {
  return prisma.inventoryReport.findUnique({
    where: { id },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function createReport(
  closingDateIso: string,
  shouldCopyPrevious: boolean,
): Promise<
  | { ok: true; id: string }
  | { ok: false; error: string }
> {
  try {
    const closing = parseLocalDate(closingDateIso);
    const { periodStart, periodEnd } = periodRangeForClosing(closing);
    const previousReport = shouldCopyPrevious
      ? await prisma.inventoryReport.findFirst({
          where: { closingDate: { lt: closing } },
          orderBy: { closingDate: "desc" },
          include: { lines: { orderBy: { sortOrder: "asc" } } },
        })
      : null;

    const r = await prisma.inventoryReport.create({
      data: {
        closingDate: closing,
        periodStart,
        periodEnd,
        lines: previousReport
          ? {
              create: previousReport.lines.map((line) => ({
                sortOrder: line.sortOrder,
                productName: line.productName,
                specification: line.specification,
                quantity: line.quantity,
                unit: line.unit,
                unitPrice: line.unitPrice,
                amount: line.amount,
                remarks: line.remarks,
                groupColor: line.groupColor,
              })),
            }
          : undefined,
      },
    });
    revalidatePath("/");
    return { ok: true, id: r.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "同じ締め日のレポートがすでに存在します。" };
    }
    return { ok: false, error: "作成に失敗しました。" };
  }
}

export async function deleteReport(id: string) {
  await prisma.inventoryReport.delete({ where: { id } });
  revalidatePath("/");
}

export async function updateReportMemo(id: string, memo: string) {
  await prisma.inventoryReport.update({
    where: { id },
    data: { memo },
  });
  revalidatePath(`/reports/${id}`);
}

export async function addLine(reportId: string) {
  const max = await prisma.inventoryLine.aggregate({
    where: { reportId },
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;
  await prisma.inventoryLine.create({
    data: {
      reportId,
      sortOrder,
      productName: "",
      specification: "",
      quantity: 0,
      unit: "",
      unitPrice: 0,
      amount: 0,
      remarks: "",
    },
  });
  revalidatePath(`/reports/${reportId}`);
}

export async function deleteLine(lineId: string, reportId: string) {
  await prisma.inventoryLine.delete({ where: { id: lineId } });
  revalidatePath(`/reports/${reportId}`);
}

export type LineUpdatePayload = {
  productName?: string;
  specification?: string;
  quantity?: string;
  unit?: string;
  unitPrice?: string;
  remarks?: string;
  groupColor?: string | null;
};

export async function updateLine(
  lineId: string,
  reportId: string,
  payload: LineUpdatePayload,
) {
  const existing = await prisma.inventoryLine.findFirst({
    where: { id: lineId, reportId },
  });
  if (!existing) return;

  let quantity = existing.quantity;
  let unitPrice = existing.unitPrice;
  if (payload.quantity !== undefined) quantity = parseQuantityInput(payload.quantity);
  if (payload.unitPrice !== undefined) unitPrice = parseMoneyInput(payload.unitPrice);

  const amount = lineAmountExTax(quantity, unitPrice);

  const data: Prisma.InventoryLineUpdateInput = {
    quantity,
    unitPrice,
    amount,
  };
  if (payload.productName !== undefined) data.productName = payload.productName;
  if (payload.specification !== undefined) data.specification = payload.specification;
  if (payload.unit !== undefined) data.unit = payload.unit;
  if (payload.remarks !== undefined) data.remarks = payload.remarks;
  if (payload.groupColor !== undefined) data.groupColor = payload.groupColor;

  await prisma.inventoryLine.update({
    where: { id: lineId },
    data,
  });
  revalidatePath(`/reports/${reportId}`);
}

export async function suggestNextClosingIso(): Promise<string> {
  const last = await prisma.inventoryReport.findFirst({
    orderBy: { closingDate: "desc" },
  });
  if (!last) {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth();
    if (now.getDate() > 20) m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    return `${y}-${String(m + 1).padStart(2, "0")}-20`;
  }
  const d = nextClosingAfter(last.closingDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function importReportCsv(
  reportId: string,
  csvText: string,
): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  try {
    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      return { ok: false, error: "CSVが空です。" };
    }

    const header = rows[0].map(normalizeHeaderName);
    const requiredColumns = ["品名", "規格", "数量", "単位", "単価(税抜)", "備考"];
    const colIndex = {
      groupColor: header.findIndex((h) => h === "グループ色"),
      productName: header.findIndex((h) => h === "品名"),
      specification: header.findIndex((h) => h === "規格"),
      quantity: header.findIndex((h) => h === "数量"),
      unit: header.findIndex((h) => h === "単位"),
      unitPrice: header.findIndex((h) => h === "単価(税抜)"),
      remarks: header.findIndex((h) => h === "備考"),
    };

    for (const col of requiredColumns) {
      if (!header.includes(col)) {
        return {
          ok: false,
          error: `CSVヘッダーに「${col}」が見つかりません。テンプレートを使ってください。`,
        };
      }
    }

    const lines = rows
      .slice(1)
      .map((r) => {
        const productName = (r[colIndex.productName] ?? "").trim();
        const specification = (r[colIndex.specification] ?? "").trim();
        const quantityRaw = (r[colIndex.quantity] ?? "").trim();
        const unit = (r[colIndex.unit] ?? "").trim();
        const unitPriceRaw = (r[colIndex.unitPrice] ?? "").trim();
        const remarks = (r[colIndex.remarks] ?? "").trim();
        const groupColorRaw = colIndex.groupColor >= 0 ? (r[colIndex.groupColor] ?? "").trim() : "";
        const groupColor = groupColorRaw === "" ? null : groupColorRaw;
        if (
          isLineBlank({
            productName,
            specification,
            quantity: quantityRaw,
            unit,
            unitPrice: unitPriceRaw,
            remarks,
            groupColor,
          })
        ) {
          return null;
        }

        const quantity = parseQuantityInput(quantityRaw);
        const unitPrice = parseMoneyInput(unitPriceRaw);
        const amount = lineAmountExTax(quantity, unitPrice);

        return {
          productName,
          specification,
          quantity,
          unit,
          unitPrice,
          amount,
          remarks,
          groupColor,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    await prisma.$transaction(async (tx) => {
      await tx.inventoryLine.deleteMany({ where: { reportId } });
      if (lines.length > 0) {
        await tx.inventoryLine.createMany({
          data: lines.map((line, idx) => ({
            reportId,
            sortOrder: idx,
            ...line,
          })),
        });
      }
    });

    revalidatePath(`/reports/${reportId}`);
    revalidatePath("/");
    return { ok: true, imported: lines.length };
  } catch {
    return { ok: false, error: "CSV取込に失敗しました。" };
  }
}
