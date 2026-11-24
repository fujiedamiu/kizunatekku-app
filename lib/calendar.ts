export type EventColor = "blue" | "green" | "red" | "amber" | "purple";

export type CalendarEvent = {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  allDay: boolean;
  /** HH:MM (allDay が false のとき) */
  start?: string;
  /** HH:MM (allDay が false のとき) */
  end?: string;
  color: EventColor;
  memo?: string;
};

export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export const COLORS: Record<
  EventColor,
  { label: string; chip: string; dot: string }
> = {
  blue: {
    label: "青",
    chip: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
    dot: "bg-blue-500",
  },
  green: {
    label: "緑",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  red: {
    label: "赤",
    chip: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
    dot: "bg-rose-500",
  },
  amber: {
    label: "黄",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  purple: {
    label: "紫",
    chip: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
    dot: "bg-violet-500",
  },
};

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 指定した月を含む 6 週間分 (42 日) の日付を日曜始まりで返す */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from(
    { length: 42 },
    (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

export function formatLongDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`;
}

export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return (a.start ?? "").localeCompare(b.start ?? "");
}
