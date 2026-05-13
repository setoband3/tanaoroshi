/** ローカル日付 YYYY-MM-DD を正午ローカルにパース（夏時間ずれを避ける） */
export function parseLocalDate(isoDate: string): Date {
  const [y, mo, da] = isoDate.split("-").map((x) => Number(x));
  if (!y || !mo || !da) throw new Error("日付形式が不正です");
  return new Date(y, mo - 1, da, 12, 0, 0, 0);
}

/** 20日締め: 締め日を含む期間の開始・終了（例: 4/20締め → 3/21〜4/20） */
export function periodRangeForClosing(closing: Date): { periodStart: Date; periodEnd: Date } {
  const periodEnd = new Date(
    closing.getFullYear(),
    closing.getMonth(),
    closing.getDate(),
    12,
    0,
    0,
    0,
  );
  const periodStart = new Date(periodEnd);
  periodStart.setMonth(periodStart.getMonth() - 1);
  periodStart.setDate(periodStart.getDate() + 1);
  return { periodStart, periodEnd };
}

export function formatPeriodRange(start: Date, end: Date): string {
  const f = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return `${f(start)}〜${f(end)}`;
}

export function formatClosingLabel(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日締め`;
}

export function nextClosingAfter(closing: Date): Date {
  const n = new Date(
    closing.getFullYear(),
    closing.getMonth(),
    closing.getDate(),
    12,
    0,
    0,
    0,
  );
  n.setMonth(n.getMonth() + 1);
  return n;
}
