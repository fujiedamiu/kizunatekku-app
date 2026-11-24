import { parseDateKey, type CalendarEvent } from "./calendar";
import type { Translate } from "./i18n/core";

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

/** OS の通知を出す。出せなかったら false */
export function showSystemNotification(r: DueReminder, t: Translate): boolean {
  if (!notificationsSupported() || Notification.permission !== "granted")
    return false;
  try {
    const { title, body } = reminderText(r, t);
    const n = new Notification(title, { body, tag: r.key });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
