"use client";

import { useEffect, useRef, useState } from "react";
import { COLORS } from "@/lib/calendar";
import { useEvents, type CalendarKind } from "@/lib/events-store";
import { useI18n } from "@/lib/i18n";
import {
  dueReminders,
  markSent,
  reminderText,
  showSystemNotification,
  type DueReminder,
} from "@/lib/notifications";

const CHECK_MS = 20_000;

type Toast = DueReminder & { kind: CalendarKind };

/**
 * 通知を設定した予定を見張り、時間になったら通知する。
 * OS の通知に加えて、画面右下にもお知らせを表示する (通知が許可されていない場合の代わりにもなる)。
 */
export default function ReminderWatcher() {
  const shared = useEvents("shared");
  const personal = useEvents("personal");
  const { t } = useI18n();
  const [toasts, setToasts] = useState<Toast[]>([]);
  // 一定間隔のチェックから最新の翻訳関数を使えるよう ref に入れておく
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // 一定間隔のチェックから最新の予定を読めるよう ref に入れておく
  const latest = useRef({ shared: shared.events, personal: personal.events });
  useEffect(() => {
    latest.current = { shared: shared.events, personal: personal.events };
  }, [shared.events, personal.events]);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const found: Toast[] = [];
      for (const kind of ["shared", "personal"] as CalendarKind[]) {
        for (const r of dueReminders(latest.current[kind] ?? [], now)) {
          if (!markSent(r.key)) continue;
          showSystemNotification(r, tRef.current);
          found.push({ ...r, kind });
        }
      }
      if (found.length > 0) setToasts((t) => [...t, ...found]);
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
        const { title, body } = reminderText(toast, t);
        return (
          <div
            key={toast.key}
            role="status"
            className="flex w-full items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            <span aria-hidden="true" className="text-lg">
              🔔
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${COLORS[toast.event.color].dot}`}
                />
                <span className="truncate font-medium">{title}</span>
              </span>
              <span className="block text-xs whitespace-pre-wrap text-zinc-500">
                {t(toast.kind === "shared" ? "calendar.shared" : "calendar.personal")} · {body}
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
