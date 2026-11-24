import { COLORS, parseDateKey, toDateKey, type EventColor } from "./calendar";
import type { ValidationError } from "./errors";

type Failure = { ok: false; error: NonNullable<ValidationError> };

/** 時限の時刻 (例: 1限 09:00〜10:30) */
export type Period = { start: string; end: string };

export type TimetableSlot = {
  id: string;
  /** 0=日 1=月 … 6=土 */
  weekday: number;
  /** periods の何番目か (0 始まり) */
  period: number;
  subject: string;
  color: EventColor;
  room?: string;
  memo?: string;
};

/** 作成・編集時にブラウザから送る内容 */
export type TimetableInput = {
  title: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  periods: Period[];
  slots: TimetableSlot[];
};

export type Timetable = TimetableInput & {
  id: string;
  ownerId: string;
  ownerName: string;
  updatedAt: string;
};

/** 画面に返すときの形 (自分が作者か / 表示中か を付ける) */
export type TimetableView = Timetable & {
  isOwner: boolean;
  subscribed: boolean;
};

export const TIMETABLE_WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;

export const DEFAULT_PERIODS: Period[] = [
  { start: "09:00", end: "10:30" },
  { start: "10:40", end: "12:10" },
  { start: "13:00", end: "14:30" },
  { start: "14:40", end: "16:10" },
  { start: "16:20", end: "17:50" },
];

export const MAX_PERIODS = 10;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** 外部から受け取った時間割の内容を検証する。OK なら整えた値、NG ならエラーメッセージ */
export function parseTimetableInput(
  value: unknown,
): { ok: true; value: TimetableInput } | Failure {
  if (typeof value !== "object" || value === null)
    return { ok: false, error: { code: "invalid" } };
  const v = value as Record<string, unknown>;

  const title = str(v.title, 100);
  if (!title) return { ok: false, error: { code: "ttTitleRequired" } };

  const startDate = typeof v.startDate === "string" ? v.startDate : "";
  const endDate = typeof v.endDate === "string" ? v.endDate : "";
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate))
    return { ok: false, error: { code: "ttDatesRequired" } };
  if (endDate < startDate)
    return { ok: false, error: { code: "ttEndBeforeStart" } };

  if (!Array.isArray(v.periods) || v.periods.length === 0)
    return { ok: false, error: { code: "ttNoPeriods" } };
  if (v.periods.length > MAX_PERIODS)
    return {
      ok: false,
      error: { code: "ttTooManyPeriods", params: { n: MAX_PERIODS } },
    };
  const periods: Period[] = [];
  for (const [i, p] of v.periods.entries()) {
    const start = (p as Period)?.start;
    const end = (p as Period)?.end;
    if (!TIME_RE.test(start) || !TIME_RE.test(end))
      return {
        ok: false,
        error: { code: "ttPeriodTime", params: { n: i + 1 } },
      };
    if (end <= start)
      return {
        ok: false,
        error: { code: "ttPeriodEndBeforeStart", params: { n: i + 1 } },
      };
    periods.push({ start, end });
  }

  if (!Array.isArray(v.slots)) return { ok: false, error: { code: "invalid" } };
  const slots: TimetableSlot[] = [];
  const used = new Set<string>();
  for (const s of v.slots as Record<string, unknown>[]) {
    const weekday = Number(s?.weekday);
    const period = Number(s?.period);
    const subject = str(s?.subject, 100);
    const id = str(s?.id, 100);
    const color = s?.color;
    if (
      !id ||
      !subject ||
      !Number.isInteger(weekday) ||
      weekday < 0 ||
      weekday > 6 ||
      !Number.isInteger(period) ||
      period < 0 ||
      period >= periods.length ||
      typeof color !== "string" ||
      !(color in COLORS)
    ) {
      continue; // 削除された時限のコマなど、不正なコマは捨てる
    }
    const cell = `${weekday}:${period}`;
    if (used.has(cell)) continue;
    used.add(cell);
    slots.push({
      id,
      weekday,
      period,
      subject,
      color: color as EventColor,
      room: str(s.room, 100) || undefined,
      memo: str(s.memo, 1000) || undefined,
    });
  }

  return { ok: true, value: { title, startDate, endDate, periods, slots } };
}

/** カレンダーに表示する時間割の授業 1 回分 */
export type ClassOccurrence = {
  /** 表示用の一意な ID */
  id: string;
  timetableId: string;
  timetableTitle: string;
  ownerName: string;
  date: string;
  start: string;
  end: string;
  subject: string;
  color: EventColor;
  room?: string;
  memo?: string;
};

/** 時間割を、指定した日付範囲 (両端含む) の授業 1 回ずつに展開する */
export function expandTimetables(
  timetables: Timetable[],
  from: string,
  to: string,
): ClassOccurrence[] {
  const result: ClassOccurrence[] = [];
  for (const tt of timetables) {
    const startKey = tt.startDate > from ? tt.startDate : from;
    const endKey = tt.endDate < to ? tt.endDate : to;
    if (startKey > endKey) continue;
    const bySlotDay = new Map<number, TimetableSlot[]>();
    for (const s of tt.slots) {
      bySlotDay.set(s.weekday, [...(bySlotDay.get(s.weekday) ?? []), s]);
    }
    const d = parseDateKey(startKey);
    for (let key = startKey; key <= endKey; ) {
      for (const s of bySlotDay.get(d.getDay()) ?? []) {
        const p = tt.periods[s.period];
        if (!p) continue;
        result.push({
          id: `${tt.id}:${s.id}:${key}`,
          timetableId: tt.id,
          timetableTitle: tt.title,
          ownerName: tt.ownerName,
          date: key,
          start: p.start,
          end: p.end,
          subject: s.subject,
          color: s.color,
          room: s.room,
          memo: s.memo,
        });
      }
      d.setDate(d.getDate() + 1);
      key = toDateKey(d);
    }
  }
  return result;
}
