"use client";

import { useCallback, useMemo, useState } from "react";
import {
  COLORS,
  compareEvents,
  formatNotifyBefore,
  monthGrid,
  parseDateKey,
  toDateKey,
  type CalendarEvent,
  type EventColor,
} from "@/lib/calendar";
import {
  setCalendarKind,
  useCalendarKind,
  useEvents,
  useToday,
  type CalendarKind,
} from "@/lib/events-store";
import { logout } from "@/lib/auth-store";
import { useI18n, type Translate } from "@/lib/i18n";
import { expandTimetables, type ClassOccurrence } from "@/lib/timetable";
import { useMyTimetables } from "@/lib/timetable-store";
import type { User } from "@/lib/user";
import EventDialog from "./EventDialog";
import TodayDialog from "./TodayDialog";
import AppMenu from "./AppMenu";
import SearchBox from "./SearchBox";
import TimetableManager from "./TimetableManager";
import ReminderWatcher from "./ReminderWatcher";

const MAX_CHIPS = 3;

type Editing = { event: CalendarEvent; isNew: boolean };

/** 1 日分に表示する項目 (予定 または 時間割の授業) */
type DayItem =
  | { type: "event"; key: string; start?: string; event: CalendarEvent }
  | { type: "class"; key: string; start?: string; cls: ClassOccurrence };

const itemTitle = (i: DayItem) =>
  i.type === "event" ? i.event.title : i.cls.subject;
const itemColor = (i: DayItem): EventColor =>
  i.type === "event" ? i.event.color : i.cls.color;

/** 終日の予定 → 時刻順 (予定と授業を混ぜて並べる) */
function sortItems(items: DayItem[]) {
  return items.sort((a, b) => {
    if (a.type === "event" && b.type === "event")
      return compareEvents(a.event, b.event);
    const allDayA = a.type === "event" && a.event.allDay;
    const allDayB = b.type === "event" && b.event.allDay;
    if (allDayA !== allDayB) return allDayA ? -1 : 1;
    return (a.start ?? "").localeCompare(b.start ?? "");
  });
}

export default function Calendar({ user }: { user: User }) {
  const { t, longDate, monthTitle, weekdayShort } = useI18n();
  const kind = useCalendarKind();
  const { events, error } = useEvents(kind);
  const { timetables } = useMyTimetables();
  const today = useToday();

  // null の間は「今日」を基準にする
  const [view, setView] = useState<{ year: number; month: number } | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const closeDialog = useCallback(() => setEditing(null), []);
  // 起動時に「本日の予定」を表示する
  const [showToday, setShowToday] = useState(true);
  const closeToday = useCallback(() => setShowToday(false), []);
  const [showTimetables, setShowTimetables] = useState(false);
  const closeTimetables = useCallback(() => setShowTimetables(false), []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events ?? []) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const goToday = useCallback(() => {
    setView(null);
    setSelected(null);
  }, []);

  /** 検索結果などから、指定カレンダーの指定日へ移動する */
  const jumpTo = useCallback((k: CalendarKind, date: string) => {
    const d = parseDateKey(date);
    setCalendarKind(k);
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(date);
  }, []);

  const header = (
    <header className="border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <AppMenu
          user={user}
          kind={kind}
          onSelectKind={setCalendarKind}
          onShowToday={() => setShowToday(true)}
          onGoToday={goToday}
          onOpenTimetables={() => setShowTimetables(true)}
          onLogout={() => void logout()}
        />
        <h1 className="hidden shrink-0 text-lg font-bold sm:block">
          {t("app.title")}
        </h1>
        <div className="flex flex-1 justify-end">
          <SearchBox onJump={jumpTo} />
        </div>
      </div>
    </header>
  );

  if (!today) {
    return (
      <>
        {header}
        <div className="flex flex-1 items-center justify-center text-zinc-500">
          {t("common.loading")}
        </div>
      </>
    );
  }

  const todayDate = parseDateKey(today);
  const { year, month } = view ?? {
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  };
  const selectedKey = selected ?? today;
  const days = monthGrid(year, month);

  // 時間割の授業は個人カレンダーに表示する (表示中の月 + 選択日 + 今日の分だけ展開)
  const classesByDate = new Map<string, ClassOccurrence[]>();
  const addClasses = (from: string, to: string) => {
    for (const c of expandTimetables(timetables ?? [], from, to)) {
      if (classesByDate.get(c.date)?.some((x) => x.id === c.id)) continue;
      classesByDate.set(c.date, [...(classesByDate.get(c.date) ?? []), c]);
    }
  };
  addClasses(toDateKey(days[0]), toDateKey(days[days.length - 1]));
  addClasses(selectedKey, selectedKey);
  addClasses(today, today);
  const todayClasses = classesByDate.get(today) ?? [];

  const itemsFor = (key: string): DayItem[] =>
    sortItems([
      ...(eventsByDate.get(key) ?? []).map(
        (event): DayItem => ({
          type: "event",
          key: event.id,
          start: event.start,
          event,
        }),
      ),
      ...(kind === "personal" ? (classesByDate.get(key) ?? []) : []).map(
        (cls): DayItem => ({ type: "class", key: cls.id, start: cls.start, cls }),
      ),
    ]);

  const selectedItems = itemsFor(selectedKey);

  const moveMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const openNew = (date: string) =>
    setEditing({
      isNew: true,
      event: {
        id: crypto.randomUUID(),
        title: "",
        date,
        allDay: false,
        start: "09:00",
        end: "10:00",
        color: "blue",
      },
    });

  return (
    <>
      {header}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4">
        {/* カレンダーの切り替え */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label={t("calendar.switcherLabel")}
            className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950"
          >
            {(["shared", "personal"] as CalendarKind[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => setCalendarKind(k)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  kind === k
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {t(k === "shared" ? "calendar.shared" : "calendar.personal")}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            {kind === "shared"
              ? t("calendar.sharedDesc")
              : t("calendar.personalDesc")}
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        <div className="flex flex-1 flex-col gap-4 lg:flex-row">
          {/* 月表示 */}
          <section className="flex flex-1 flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <header className="flex items-center gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
              <h2 className="mr-auto text-xl font-semibold tabular-nums">
                {monthTitle(year, month)}
                {!events && (
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    {t("common.loading")}
                  </span>
                )}
              </h2>
              <button
                onClick={goToday}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {t("common.today")}
              </button>
              <button
                onClick={() => moveMonth(-1)}
                aria-label={t("calendar.prevMonth")}
                className="rounded-lg px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ‹
              </button>
              <button
                onClick={() => moveMonth(1)}
                aria-label={t("calendar.nextMonth")}
                className="rounded-lg px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ›
              </button>
            </header>

            <div className="grid grid-cols-7 border-b border-zinc-200 text-center text-xs font-medium dark:border-zinc-800">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`py-2 ${
                    i === 0
                      ? "text-rose-600"
                      : i === 6
                        ? "text-blue-600"
                        : "text-zinc-500"
                  }`}
                >
                  {weekdayShort(i)}
                </div>
              ))}
            </div>

            <div className="grid flex-1 grid-cols-7 grid-rows-6">
              {days.map((d) => {
                const key = toDateKey(d);
                const inMonth = d.getMonth() === month;
                const isToday = key === today;
                const isSelected = key === selectedKey;
                const items = itemsFor(key);
                const dow = d.getDay();

                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    onDoubleClick={() => events && openNew(key)}
                    aria-label={t("calendar.dayAria", {
                      date: longDate(key),
                      n: items.length,
                    })}
                    aria-pressed={isSelected}
                    className={`flex min-h-20 flex-col items-stretch gap-1 border-r border-b border-zinc-100 p-1 text-left transition-colors sm:min-h-24 dark:border-zinc-900 ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-500/10"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    } ${inMonth ? "" : "opacity-40"}`}
                  >
                    <span
                      className={`flex size-6 items-center justify-center self-start rounded-full text-xs tabular-nums ${
                        isToday
                          ? "bg-blue-600 font-semibold text-white"
                          : dow === 0
                            ? "text-rose-600"
                            : dow === 6
                              ? "text-blue-600"
                              : ""
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {items.slice(0, MAX_CHIPS).map((item) => (
                      <span
                        key={item.key}
                        className={`truncate rounded px-1 text-[11px] leading-5 ${COLORS[itemColor(item)].chip} ${
                          item.type === "class"
                            ? "border-l-2 border-current/40"
                            : ""
                        }`}
                      >
                        <span className="hidden sm:inline">
                          {item.start &&
                          !(item.type === "event" && item.event.allDay)
                            ? `${item.start} `
                            : ""}
                        </span>
                        {itemTitle(item)}
                      </span>
                    ))}
                    {items.length > MAX_CHIPS && (
                      <span className="px-1 text-[11px] text-zinc-500">
                        {t("calendar.more", { n: items.length - MAX_CHIPS })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 選択日の予定 */}
          <aside className="flex w-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 lg:w-80 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-zinc-500">
                  {t(kind === "shared" ? "calendar.shared" : "calendar.personal")}
                </p>
                <h3 className="font-semibold">{longDate(selectedKey)}</h3>
              </div>
              <button
                onClick={() => openNew(selectedKey)}
                disabled={!events}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {t("common.add")}
              </button>
            </div>

            {selectedItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                {t("common.noEvents")}
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedItems.map((item) =>
                  item.type === "event" ? (
                    <li key={item.key}>
                      <button
                        onClick={() =>
                          setEditing({ event: item.event, isNew: false })
                        }
                        className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        <EventSummary event={item.event} t={t} />
                      </button>
                    </li>
                  ) : (
                    <li key={item.key}>
                      <button
                        onClick={() => setShowTimetables(true)}
                        className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      >
                        <ClassSummary cls={item.cls} t={t} />
                      </button>
                    </li>
                  ),
                )}
              </ul>
            )}

            <p className="mt-auto text-xs text-zinc-400">
              {t("calendar.hintDoubleClick")}
              {kind === "personal" &&
                ` ${t("calendar.hintTimetable")}`}
            </p>
          </aside>
        </div>

        {showToday && (
          <TodayDialog
            today={today}
            classes={timetables ? todayClasses : null}
            onClose={closeToday}
          />
        )}

        {showTimetables && (
          <TimetableManager today={today} onClose={closeTimetables} />
        )}

        <ReminderWatcher />

        {editing && (
          <EventDialog
            key={`${kind}:${editing.event.id}`}
            kind={kind}
            event={editing.event}
            isNew={editing.isNew}
            onClose={closeDialog}
          />
        )}
      </div>
    </>
  );
}

function EventSummary({
  event: e,
  t,
}: {
  event: CalendarEvent;
  t: Translate;
}) {
  return (
    <>
      <span
        className={`mt-1.5 size-2.5 shrink-0 rounded-full ${COLORS[e.color].dot}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{e.title}</span>
        <span className="block text-xs text-zinc-500 tabular-nums">
          {e.allDay ? t("common.allDay") : `${e.start ?? ""}${e.end ? ` 〜 ${e.end}` : ""}`}
          {e.notifyBefore !== undefined && (
            <span className="ml-2" title={t("calendar.notifyOn")}>
              🔔 {formatNotifyBefore(e.notifyBefore, t)}
            </span>
          )}
        </span>
        {e.memo && (
          <span className="mt-1 block text-xs whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
            {e.memo}
          </span>
        )}
      </span>
    </>
  );
}

export function ClassSummary({
  cls: c,
  t,
}: {
  cls: ClassOccurrence;
  t: Translate;
}) {
  return (
    <>
      <span
        className={`mt-1.5 size-2.5 shrink-0 rounded-sm ${COLORS[c.color].dot}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{c.subject}</span>
        <span className="block text-xs text-zinc-500 tabular-nums">
          {c.start} 〜 {c.end}
          {c.room ? ` · ${c.room}` : ""}
        </span>
        <span className="block truncate text-xs text-zinc-400">
          {t("calendar.timetableLabel", { title: c.timetableTitle })}
        </span>
        {c.memo && (
          <span className="mt-1 block text-xs whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
            {c.memo}
          </span>
        )}
      </span>
    </>
  );
}
