"use client";

import { useCallback, useMemo, useState } from "react";
import {
  COLORS,
  WEEKDAYS,
  compareEvents,
  formatLongDate,
  monthGrid,
  parseDateKey,
  toDateKey,
  type CalendarEvent,
} from "@/lib/calendar";
import {
  CALENDAR_LABELS,
  setCalendarKind,
  useCalendarKind,
  useEvents,
  useToday,
  type CalendarKind,
} from "@/lib/events-store";
import EventDialog from "./EventDialog";
import TodayDialog from "./TodayDialog";

const MAX_CHIPS = 3;

type Editing = { event: CalendarEvent; isNew: boolean };

export default function Calendar() {
  const kind = useCalendarKind();
  const { events, error } = useEvents(kind);
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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events ?? []) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    for (const list of map.values()) list.sort(compareEvents);
    return map;
  }, [events]);

  if (!today) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        読み込み中…
      </div>
    );
  }

  const todayDate = parseDateKey(today);
  const { year, month } = view ?? {
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  };
  const selectedKey = selected ?? today;
  const days = monthGrid(year, month);
  const selectedEvents = eventsByDate.get(selectedKey) ?? [];

  const moveMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const goToday = () => {
    setView(null);
    setSelected(null);
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
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4">
      {/* カレンダーの切り替え */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="表示するカレンダー"
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
              {CALENDAR_LABELS[k]}カレンダー
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          {kind === "shared"
            ? "みんなで共有する予定です。追加・変更は全員に表示されます。"
            : "自分だけの予定です。このブラウザにのみ保存されます。"}
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
            {year}年{month + 1}月
            {!events && (
              <span className="ml-2 text-sm font-normal text-zinc-500">
                読み込み中…
              </span>
            )}
          </h2>
          <button
            onClick={goToday}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            今日
          </button>
          <button
            onClick={() => moveMonth(-1)}
            aria-label="前の月"
            className="rounded-lg px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ‹
          </button>
          <button
            onClick={() => moveMonth(1)}
            aria-label="次の月"
            className="rounded-lg px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ›
          </button>
        </header>

        <div className="grid grid-cols-7 border-b border-zinc-200 text-center text-xs font-medium dark:border-zinc-800">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 ${
                i === 0
                  ? "text-rose-600"
                  : i === 6
                    ? "text-blue-600"
                    : "text-zinc-500"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7 grid-rows-6">
          {days.map((d) => {
            const key = toDateKey(d);
            const inMonth = d.getMonth() === month;
            const isToday = key === today;
            const isSelected = key === selectedKey;
            const dayEvents = eventsByDate.get(key) ?? [];
            const dow = d.getDay();

            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                onDoubleClick={() => events && openNew(key)}
                aria-label={`${formatLongDate(key)}、予定${dayEvents.length}件`}
                aria-pressed={isSelected}
                className={`flex min-h-20 flex-col items-stretch gap-1 border-b border-r border-zinc-100 p-1 text-left transition-colors dark:border-zinc-900 sm:min-h-24 ${
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
                {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                  <span
                    key={e.id}
                    className={`truncate rounded px-1 text-[11px] leading-5 ${COLORS[e.color].chip}`}
                  >
                    <span className="hidden sm:inline">
                      {!e.allDay && e.start ? `${e.start} ` : ""}
                    </span>
                    {e.title}
                  </span>
                ))}
                {dayEvents.length > MAX_CHIPS && (
                  <span className="px-1 text-[11px] text-zinc-500">
                    他{dayEvents.length - MAX_CHIPS}件
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 選択日の予定 */}
      <aside className="flex w-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:w-80">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-zinc-500">
              {CALENDAR_LABELS[kind]}カレンダー
            </p>
            <h3 className="font-semibold">{formatLongDate(selectedKey)}</h3>
          </div>
          <button
            onClick={() => openNew(selectedKey)}
            disabled={!events}
            className="rounded-lg disabled:opacity-50 bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            ＋ 追加
          </button>
        </div>

        {selectedEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            予定はありません
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedEvents.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => setEditing({ event: e, isNew: false })}
                  className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full ${COLORS[e.color].dot}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {e.title}
                    </span>
                    <span className="block text-xs text-zinc-500 tabular-nums">
                      {e.allDay
                        ? "終日"
                        : `${e.start ?? ""}${e.end ? ` 〜 ${e.end}` : ""}`}
                    </span>
                    {e.memo && (
                      <span className="mt-1 block whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
                        {e.memo}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-auto text-xs text-zinc-400">
          日付をダブルクリックでも予定を追加できます。
        </p>
      </aside>
      </div>

      {showToday && <TodayDialog today={today} onClose={closeToday} />}

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
  );
}
