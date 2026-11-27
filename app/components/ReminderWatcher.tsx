"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { COLORS, toDateKey, type EventColor } from "@/lib/calendar";
import { useEvents, type CalendarKind } from "@/lib/events-store";
import { useI18n, type Translate } from "@/lib/i18n";
import {
  classReminderText,
  dueClassReminders,
  dueReminders,
  getClassNotify,
  markSent,
  reminderText,
  showSystemNotification,
  subscribeClassNotify,
  type DueClassReminder,
  type DueReminder,
} from "@/lib/notifications";
import { expandTimetables, type Timetable } from "@/lib/timetable";

const CHECK_MS = 20_000;

type Toast =
  | { type: "event"; key: string; kind: CalendarKind; reminder: DueReminder }
  | { type: "class"; key: string; reminder: DueClassReminder };

function toastText(toast: Toast, t: Translate) {
  return toast.type === "event"
    ? reminderText(toast.reminder, t)
    : classReminderText(toast.reminder, t);
}

function toastColor(toast: Toast): EventColor {
  return toast.type === "event"
    ? toast.reminder.event.color
    : toast.reminder.cls.color;
}

/**
 * 通知を設定した予定と、時間割の授業 (開始 5 分前・開始時刻) を見張り、時間になったら通知する。
 * OS の通知に加えて、画面右下にもお知らせを表示する (通知が許可されていない場合の代わりにもなる)。
 * 画面 (タブ) を開いている間だけ動く。
 */
export default function ReminderWatcher({
  timetables,
}: {
  /** ログイン中の人の時間割 (未ログインなら null) */
  timetables: Timetable[] | null;
}) {
  const shared = useEvents("shared");
  const personal = useEvents("personal");
  const classNotify = useSyncExternalStore(
    subscribeClassNotify,
    getClassNotify,
    () => false,
  );
  const { t } = useI18n();
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 一定間隔のチェックから最新の値を読めるよう ref に入れておく
  const latest = useRef({
    t,
    shared: shared.events,
    personal: personal.events,
    timetables: classNotify ? timetables : null,
  });
  useEffect(() => {
    latest.current = {
      t,
      shared: shared.events,
      personal: personal.events,
      timetables: classNotify ? timetables : null,
    };
  }, [t, shared.events, personal.events, timetables, classNotify]);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const cur = latest.current;
      const found: Toast[] = [];
      for (const kind of ["shared", "personal"] as CalendarKind[]) {
        for (const r of dueReminders(cur[kind] ?? [], now)) {
          if (!markSent(r.key)) continue;
          const { title, body } = reminderText(r, cur.t);
          showSystemNotification(r.key, title, body);
          found.push({ type: "event", key: r.key, kind, reminder: r });
        }
      }
      if (cur.timetables) {
        const today = toDateKey(now);
        const classes = expandTimetables(cur.timetables, today, today);
        for (const r of dueClassReminders(classes, now)) {
          if (!markSent(r.key)) continue;
          const { title, body } = classReminderText(r, cur.t);
          showSystemNotification(r.key, title, body);
          found.push({ type: "class", key: r.key, reminder: r });
        }
      }
      if (found.length > 0) {
        setToasts((list) => {
          // 同じ授業の「5分前」は「開始」が出たら片付ける
          const started = new Set(
            found.flatMap((f) =>
              f.type === "class" && f.reminder.phase === "start"
                ? [f.reminder.cls.id]
                : [],
            ),
          );
          return [
            ...list.filter(
              (x) => !(x.type === "class" && started.has(x.reminder.cls.id)),
            ),
            ...found,
          ];
        });
      }
    };
    const first = window.setTimeout(check, 1_000);
    const timer = window.setInterval(check, CHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:w-80"
    >
      {toasts.map((toast) => {
        const { title, body } = toastText(toast, t);
        const label =
          toast.type === "class"
            ? t("today.timetable")
            : t(
                toast.kind === "shared"
                  ? "calendar.shared"
                  : "calendar.personal",
              );
        return (
          <div
            key={toast.key}
            role="status"
            className="flex w-full items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            <span aria-hidden="true" className="text-lg">
              {toast.type === "class" ? "📚" : "🔔"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${COLORS[toastColor(toast)].dot}`}
                />
                <span className="font-medium break-words">{title}</span>
              </span>
              <span className="block text-xs whitespace-pre-wrap text-zinc-500">
                {label} · {body}
              </span>
            </span>
            <button
              onClick={() =>
                setToasts((list) => list.filter((x) => x.key !== toast.key))
              }
              aria-label={t("reminder.dismiss")}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
