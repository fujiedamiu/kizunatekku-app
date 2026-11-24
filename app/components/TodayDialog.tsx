"use client";

import { useEffect } from "react";
import {
  COLORS,
  compareEvents,
  type CalendarEvent,
} from "@/lib/calendar";
import {
  useEvents,
  type CalendarKind,
} from "@/lib/events-store";
import { useI18n } from "@/lib/i18n";
import type { ClassOccurrence } from "@/lib/timetable";

type Props = {
  today: string;
  /** 今日の時間割の授業 */
  classes: ClassOccurrence[] | null;
  onClose: () => void;
};

const KINDS: CalendarKind[] = ["shared", "personal"];

/** 起動時に、共通・個人カレンダーの今日の予定をまとめて表示するポップアップ */
export default function TodayDialog({ today, classes, onClose }: Props) {
  const { t, longDate } = useI18n();
  const shared = useEvents("shared");
  const personal = useEvents("personal");
  const states = { shared, personal };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const todays = (events: CalendarEvent[] | null) =>
    (events ?? []).filter((e) => e.date === today).sort(compareEvents);

  const total = KINDS.reduce(
    (n, k) => n + todays(states[k].events).length,
    classes?.length ?? 0,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="today-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900"
      >
        <header>
          <p className="text-sm text-zinc-500">{longDate(today)}</p>
          <h2 id="today-dialog-title" className="text-lg font-semibold">
            {t("today.title")}
            <span className="ml-2 text-sm font-normal text-zinc-500">
              {t("today.count", { n: total })}
            </span>
          </h2>
        </header>

        <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1">
          {KINDS.map((k) => {
            const { events, error } = states[k];
            const list = todays(events);
            return (
              <div key={k} className="space-y-1">
                <h3 className="text-xs font-semibold text-zinc-500">
                  {t(k === "shared" ? "calendar.shared" : "calendar.personal")}
                </h3>
                {error && !events ? (
                  <p className="py-2 text-sm text-rose-600">{error}</p>
                ) : !events ? (
                  <p className="py-2 text-sm text-zinc-500">{t("common.loading")}</p>
                ) : list.length === 0 ? (
                  <p className="py-2 text-sm text-zinc-500">
                    {t("common.noEvents")}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {list.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-start gap-3 rounded-xl p-2"
                      >
                        <span
                          className={`mt-1.5 size-2.5 shrink-0 rounded-full ${COLORS[e.color].dot}`}
                        />
                        <span className="w-24 shrink-0 text-sm text-zinc-500 tabular-nums">
                          {e.allDay
                            ? t("common.allDay")
                            : `${e.start ?? ""}${e.end ? `〜${e.end}` : ""}`}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium break-words">
                            {e.title}
                          </span>
                          {e.memo && (
                            <span className="mt-0.5 block whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
                              {e.memo}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-zinc-500">{t("today.timetable")}</h3>
            {!classes ? (
              <p className="py-2 text-sm text-zinc-500">{t("common.loading")}</p>
            ) : classes.length === 0 ? (
              <p className="py-2 text-sm text-zinc-500">{t("today.noClasses")}</p>
            ) : (
              <ul className="space-y-1">
                {[...classes]
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .map((c) => (
                    <li key={c.id} className="flex items-start gap-3 rounded-xl p-2">
                      <span
                        className={`mt-1.5 size-2.5 shrink-0 rounded-sm ${COLORS[c.color].dot}`}
                      />
                      <span className="w-24 shrink-0 text-sm text-zinc-500 tabular-nums">
                        {c.start}〜{c.end}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium break-words">
                          {c.subject}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {c.room ? `${c.room} · ` : ""}
                          {c.timetableTitle}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        <button
          autoFocus
          onClick={onClose}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t("common.close")}
        </button>
      </section>
    </div>
  );
}
