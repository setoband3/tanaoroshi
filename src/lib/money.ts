import { Prisma } from "@prisma/client";

export function parseMoneyInput(raw: string): Prisma.Decimal {
  const n = raw.replace(/,/g, "").trim();
  if (n === "" || n === "-") return new Prisma.Decimal(0);
  try {
    return new Prisma.Decimal(n);
  } catch {
    return new Prisma.Decimal(0);
  }
}

/** 数量入力（カンマ可・小数可） */
export function parseQuantityInput(raw: string): Prisma.Decimal {
  return parseMoneyInput(raw);
}

/** 税抜の行合計（数量×単価） */
export function lineAmountExTax(quantity: Prisma.Decimal, unitPrice: Prisma.Decimal): Prisma.Decimal {
  return quantity.mul(unitPrice);
}

export function formatMoney(d: Prisma.Decimal | string | number): string {
  const x = new Prisma.Decimal(d);
  return x.toFixed(0);
}
