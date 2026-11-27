import { parseDateKey, type CalendarEvent } from "./calendar";
import type { Translate } from "./i18n/core";
import type { ClassOccurrence } from "./timetable";

/** ブラウザ通知が使えるか */
export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * 通知の許可を求める。予定に通知を設定したとき (ユーザー操作の中) に呼ぶ。
 * 戻り値: granted / denied / default / unsupported
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** 予定の開始日時 */
export function eventStart(e: CalendarEvent): Date | null {
  if (e.allDay || !e.start) return null;
  const d = parseDateKey(e.date);
  const [h, m] = e.start.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export type DueReminder = {
  /** 同じ通知を二重に出さないためのキー */
  key: string;
  event: CalendarEvent;
  /** 開始までの残り分 */
  minutesLeft: number;
};

/** 今まさに通知すべき予定 (通知時刻を過ぎていて、まだ始まっていないもの) */
export function dueReminders(
  events: CalendarEvent[],
  now: Date,
): DueReminder[] {
  const due: DueReminder[] = [];
  for (const e of events) {
    if (!e.notifyBefore) continue;
    const start = eventStart(e);
    if (!start) continue;
    const notifyAt = start.getTime() - e.notifyBefore * 60_000;
    if (now.getTime() < notifyAt || now.getTime() >= start.getTime()) continue;
    due.push({
      key: `${e.id}|${e.date}|${e.start}|${e.notifyBefore}`,
      event: e,
      minutesLeft: Math.ceil((start.getTime() - now.getTime()) / 60_000),
    });
  }
  return due;
}

// ---------------------------------------------------------------------------
// 通知済みの記録 (再読み込みや別タブで同じ通知を何度も出さないため)
// ---------------------------------------------------------------------------

const SENT_KEY = "kizunatekku.notified.v1";
const KEEP_MS = 3 * 24 * 60 * 60 * 1000;

function readSent(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(SENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

const memorySent = new Set<string>();

/** まだ通知していなければ記録して true を返す */
export function markSent(key: string): boolean {
  if (memorySent.has(key)) return false;
  const sent = readSent();
  if (sent[key]) {
    memorySent.add(key);
    return false;
  }
  memorySent.add(key);
  const now = Date.now();
  const next: Record<string, number> = { [key]: now };
  for (const [k, t] of Object.entries(sent)) {
    if (now - t < KEEP_MS) next[k] = t;
  }
  try {
    window.localStorage.setItem(SENT_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくてもこのタブ内では二重通知しない
  }
  return true;
}

export function reminderText(
  r: DueReminder,
  t: Translate,
): { title: string; body: string } {
  const e = r.event;
  const h = Math.floor(r.minutesLeft / 60);
  const m = r.minutesLeft % 60;
  const left =
    h === 0
      ? t("reminder.inMinutes", { n: m })
      : m === 0
        ? t("reminder.inHours", { h })
        : t("reminder.inHoursMinutes", { h, m });
  const time = `${e.start}${e.end ? `–${e.end}` : ""}`;
  return {
    title: t("reminder.title", { left, title: e.title }),
    body: `${t("reminder.body", { time })}${e.memo ? `\n${e.memo}` : ""}`,
  };
}

// ---------------------------------------------------------------------------
// 時間割の授業の通知 (開始 5 分前と、開始時刻)
// ---------------------------------------------------------------------------

/** 授業の何分前に知らせるか */
export const CLASS_NOTIFY_BEFORE_MIN = 5;
/** 開始のお知らせを、開始から何分後まで出すか (少し遅れて画面を開いた場合のため) */
const CLASS_START_GRACE_MIN = 10;

export type DueClassReminder = {
  key: string;
  cls: ClassOccurrence;
  /** before: 開始前のお知らせ / start: 授業開始のお知らせ */
  phase: "before" | "start";
  minutesLeft: number;
};

function classStart(c: ClassOccurrence): Date {
  const d = parseDateKey(c.date);
  const [h, m] = c.start.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

/** 今まさに知らせるべき授業 */
export function dueClassReminders(
  classes: ClassOccurrence[],
  now: Date,
): DueClassReminder[] {
  const due: DueClassReminder[] = [];
  const t = now.getTime();
  for (const c of classes) {
    const start = classStart(c).getTime();
    const before = start - CLASS_NOTIFY_BEFORE_MIN * 60_000;
    if (t >= before && t < start) {
      due.push({
        key: `class|${c.id}|${c.start}|before`,
        cls: c,
        phase: "before",
        minutesLeft: Math.ceil((start - t) / 60_000),
      });
    } else if (t >= start && t < start + CLASS_START_GRACE_MIN * 60_000) {
      due.push({
        key: `class|${c.id}|${c.start}|start`,
        cls: c,
        phase: "start",
        minutesLeft: 0,
      });
    }
  }
  return due;
}

export function classReminderText(
  r: DueClassReminder,
  t: Translate,
): { title: string; body: string } {
  const c = r.cls;
  const time = `${c.start}–${c.end}${c.room ? ` · ${c.room}` : ""}`;
  if (r.phase === "start") {
    return {
      title: t("classReminder.start"),
      body: `${c.subject}\n${time}`,
    };
  }
  return {
    title: t("reminder.title", {
      left: t("reminder.inMinutes", { n: r.minutesLeft }),
      title: c.subject,
    }),
    body: time,
  };
}

/** 授業の通知をするかどうか (ブラウザごとに覚えておく。最初はオン) */
const CLASS_NOTIFY_KEY = "kizunatekku.class-notify";
const classNotifyListeners = new Set<() => void>();
let classNotifyMemory: boolean | null = null;

export function getClassNotify(): boolean {
  if (classNotifyMemory !== null) return classNotifyMemory;
  try {
    return window.localStorage.getItem(CLASS_NOTIFY_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setClassNotify(on: boolean) {
  classNotifyMemory = on;
  try {
    window.localStorage.setItem(CLASS_NOTIFY_KEY, on ? "on" : "off");
  } catch {
    // 保存できなくてもこのページ内では切り替わる
  }
  classNotifyListeners.forEach((l) => l());
}

export function subscribeClassNotify(listener: () => void) {
  classNotifyListeners.add(listener);
  return () => {
    classNotifyListeners.delete(listener);
  };
}

/** OS の通知を出す。出せなかったら false */
export function showSystemNotification(
  key: string,
  title: string,
  body: string,
): boolean {
  if (!notificationsSupported() || Notification.permission !== "granted")
    return false;
  try {
    const n = new Notification(title, { body, tag: key });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
