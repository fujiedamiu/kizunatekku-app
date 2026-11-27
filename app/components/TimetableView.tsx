"use client";

import { parseDateKey } from "@/lib/calendar";
import { useI18n } from "@/lib/i18n";
import type { TimetableView as Timetable } from "@/lib/timetable";
import { TimetableGrid } from "./TimetableEditor";

/**
 * 「時間割」タブ。自分の時間割と、表示中の他の人の時間割を、曜日×時限の表で見せる。
 * (授業はカレンダーには並べない)
 */
export default function TimetableView({
  timetables,
  today,
  onManage,
}: {
  timetables: Timetable[] | null;
  today: string;
  onManage: () => void;
}) {
  const { t, longDate } = useI18n();
  const todayWeekday = parseDateKey(today).getDay();
  const isActive = (tt: Timetable) =>
    tt.startDate <= today && today <= tt.endDate;
  // いま期間中の時間割を先に出す
  const list = [...(timetables ?? [])].sort(
    (a, b) => Number(isActive(b)) - Number(isActive(a)),
  );

  const manageButton = (
    <button
      onClick={onManage}
      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
    >
      {t("menu.timetableManage")}
    </button>
  );

  if (!timetables) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        {t("common.loading")}
      </p>
    );
  }

  if (list.length === 0) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">{t("calendar.timetableEmpty")}</p>
        {manageButton}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{manageButton}</div>
      {list.map((tt) => {
        const active = isActive(tt);
        return (
          <section
            key={tt.id}
            className={`space-y-3 rounded-2xl border bg-white p-4 dark:bg-zinc-950 ${
              active
                ? "border-zinc-200 dark:border-zinc-800"
                : "border-zinc-200 opacity-60 dark:border-zinc-800"
            }`}
          >
            <header>
              <h2 className="text-lg font-semibold break-words">{tt.title}</h2>
              <p className="text-xs text-zinc-500">
                {t("tt.cardMeta", {
                  owner: tt.ownerName,
                  start: longDate(tt.startDate),
                  end: longDate(tt.endDate),
                  n: tt.slots.length,
                })}
              </p>
            </header>
            <TimetableGrid
              periods={tt.periods}
              slotAt={(w, p) =>
                tt.slots.find((s) => s.weekday === w && s.period === p)
              }
              highlightWeekday={active ? todayWeekday : undefined}
            />
          </section>
        );
      })}
    </div>
  );
}
