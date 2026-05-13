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

export async function createReport(closingDateIso: string): Promise<
  | { ok: true; id: string }
  | { ok: false; error: string }
> {
  try {
    const closing = parseLocalDate(closingDateIso);
    const { periodStart, periodEnd } = periodRangeForClosing(closing);
    const r = await prisma.inventoryReport.create({
      data: {
        closingDate: closing,
        periodStart,
        periodEnd,
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
