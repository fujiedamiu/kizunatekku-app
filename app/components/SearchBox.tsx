"use client";

import { useId, useMemo, useState } from "react";
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

type Props = {
  /** 検索結果を選んだときに、そのカレンダー・日付へ移動する */
  onJump: (kind: CalendarKind, date: string) => void;
  /** 未ログインのときは共通カレンダーだけを検索する */
  sharedOnly?: boolean;
};

type Hit = { kind: CalendarKind; event: CalendarEvent };

const MAX_RESULTS = 30;

/** 全角・半角や大文字・小文字の違いを無視して比べるための正規化 */
const normalize = (s: string) => s.normalize("NFKC").toLowerCase();

/** 共通・個人の両方のカレンダーから、タイトルとメモで予定を検索する */
export default function SearchBox({ onJump, sharedOnly = false }: Props) {
  const { t, longDate } = useI18n();
  const shared = useEvents("shared");
  const personal = useEvents("personal");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const q = normalize(query.trim());

  const hits = useMemo<Hit[]>(() => {
    if (!q) return [];
    const all: Hit[] = [
      ...(shared.events ?? []).map((event) => ({
        kind: "shared" as const,
        event,
      })),
      ...(sharedOnly ? [] : (personal.events ?? [])).map((event) => ({
        kind: "personal" as const,
        event,
      })),
    ];
    return all
      .filter(({ event }) =>
        normalize(`${event.title}\n${event.memo ?? ""}`).includes(q),
      )
      .sort(
        (a, b) =>
          a.event.date.localeCompare(b.event.date) ||
          compareEvents(a.event, b.event),
      );
  }, [q, shared.events, personal.events, sharedOnly]);

  const shown = hits.slice(0, MAX_RESULTS);
  const expanded = open && q.length > 0;

  const select = (hit: Hit) => {
    onJump(hit.kind, hit.event.date);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (expanded) setOpen(false);
      else setQuery("");
      return;
    }
    if (!expanded || shown.length === 0) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % shown.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + shown.length) % shown.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(shown[Math.min(active, shown.length - 1)]);
    }
  };

  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <div className="relative w-full max-w-md">
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        role="combobox"
        aria-label={t("search.label")}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && shown.length > 0 ? optionId(active) : undefined
        }
        placeholder={t("search.placeholder")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-zinc-300 bg-zinc-50 py-1.5 pr-3 pl-9 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
      />

      {expanded && (
        <div
          // 結果をクリックしても入力欄からフォーカスが外れないようにする
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full right-0 left-0 z-40 mt-1 max-h-[60vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {shown.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-zinc-500">
              {t("search.noResults", { q: query.trim() })}
            </p>
          ) : (
            <>
              <ul id={listId} role="listbox" aria-label={t("search.results")}>
                {shown.map((hit, i) => (
                  <li
                    key={`${hit.kind}:${hit.event.id}`}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => select(hit)}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 ${
                      i === active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                    }`}
                  >
                    <span
                      className={`mt-1.5 size-2.5 shrink-0 rounded-full ${COLORS[hit.event.color].dot}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {hit.event.title}
                      </span>
                      <span className="block text-xs text-zinc-500 tabular-nums">
                        {longDate(hit.event.date)}
                        {hit.event.allDay
                          ? ` ${t("common.allDay")}`
                          : hit.event.start
                            ? ` ${hit.event.start}`
                            : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {t(hit.kind === "shared" ? "calendar.sharedShort" : "calendar.personalShort")}
                    </span>
                  </li>
                ))}
              </ul>
              {hits.length > shown.length && (
                <p className="px-3 py-2 text-xs text-zinc-500">
                  {t("search.more", { n: hits.length - shown.length })}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
