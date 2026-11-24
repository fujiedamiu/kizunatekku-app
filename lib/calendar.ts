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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/** 外部から受け取った値を検証し、正しい予定なら整えて返す (不正なら null) */
export function parseEvent(value: unknown): CalendarEvent | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || v.id.length === 0 || v.id.length > 100)
    return null;
  if (typeof v.title !== "string") return null;
  const title = v.title.trim();
  if (title.length === 0 || title.length > 200) return null;
  if (typeof v.date !== "string" || !DATE_RE.test(v.date)) return null;
  if (typeof v.allDay !== "boolean") return null;
  if (typeof v.color !== "string" || !(v.color in COLORS)) return null;
  const time = (t: unknown) =>
    typeof t === "string" && TIME_RE.test(t) ? t : undefined;
  if (v.memo !== undefined && typeof v.memo !== "string") return null;
  const memo = typeof v.memo === "string" ? v.memo.slice(0, 2000) : undefined;
  return {
    id: v.id,
    title,
    date: v.date,
    allDay: v.allDay,
    start: v.allDay ? undefined : time(v.start),
    end: v.allDay ? undefined : time(v.end),
    color: v.color as EventColor,
    memo: memo || undefined,
  };
}
