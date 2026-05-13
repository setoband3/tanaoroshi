import type { InventoryLine, InventoryReport } from "@prisma/client";

export type SerializedLine = {
  id: string;
  sortOrder: number;
  productName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  amount: string;
  remarks: string;
  groupColor: string | null;
};

export type SerializedReport = {
  id: string;
  closingDate: string;
  periodStart: string;
  periodEnd: string;
  memo: string;
  lines: SerializedLine[];
};

function lineToSerialized(l: InventoryLine): SerializedLine {
  return {
    id: l.id,
    sortOrder: l.sortOrder,
    productName: l.productName,
    quantity: l.quantity.toString(),
    unit: l.unit,
    unitPrice: l.unitPrice.toString(),
    amount: l.amount.toString(),
    remarks: l.remarks,
    groupColor: l.groupColor,
  };
}

export function reportToSerialized(
  r: InventoryReport & { lines: InventoryLine[] },
): SerializedReport {
  return {
    id: r.id,
    closingDate: r.closingDate.toISOString(),
    periodStart: r.periodStart.toISOString(),
    periodEnd: r.periodEnd.toISOString(),
    memo: r.memo,
    lines: r.lines.map(lineToSerialized),
  };
}
