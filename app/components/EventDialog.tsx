"use client";

import { useEffect, useState } from "react";
import {
  COLORS,
  type CalendarEvent,
  type EventColor,
} from "@/lib/calendar";
import { deleteEvent, saveEvent } from "@/lib/events-store";

type Props = {
  event: CalendarEvent;
  isNew: boolean;
  onClose: () => void;
};

export default function EventDialog({ event, isNew, onClose }: Props) {
  const [draft, setDraft] = useState<CalendarEvent>(event);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = <K extends keyof CalendarEvent>(
    key: K,
    value: CalendarEvent[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setError("タイトルを入力してください");
      return;
    }
    if (!draft.allDay && draft.start && draft.end && draft.end < draft.start) {
      setError("終了時刻は開始時刻より後にしてください");
      return;
    }
    saveEvent({
      ...draft,
      title,
      memo: draft.memo?.trim() || undefined,
      start: draft.allDay ? undefined : draft.start,
      end: draft.allDay ? undefined : draft.end,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`「${event.title}」を削除しますか？`)) {
      deleteEvent(event.id);
      onClose();
    }
  };

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900"
      >
        <h2 id="event-dialog-title" className="text-lg font-semibold">
          {isNew ? "予定を追加" : "予定を編集"}
        </h2>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            タイトル
          </span>
          <input
            autoFocus
            className={inputClass}
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="例：打ち合わせ"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">日付</span>
          <input
            type="date"
            required
            className={inputClass}
            value={draft.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.allDay}
            onChange={(e) => update("allDay", e.target.checked)}
            className="size-4"
          />
          終日
        </label>

        {!draft.allDay && (
          <div className="flex items-center gap-2">
            <input
              type="time"
              aria-label="開始時刻"
              className={inputClass}
              value={draft.start ?? ""}
              onChange={(e) => update("start", e.target.value)}
            />
            <span className="text-zinc-500">〜</span>
            <input
              type="time"
              aria-label="終了時刻"
              className={inputClass}
              value={draft.end ?? ""}
              onChange={(e) => update("end", e.target.value)}
            />
          </div>
        )}

        <fieldset className="space-y-1">
          <legend className="text-sm text-zinc-600 dark:text-zinc-400">色</legend>
          <div className="flex gap-2">
            {(Object.keys(COLORS) as EventColor[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-label={COLORS[c].label}
                aria-pressed={draft.color === c}
                onClick={() => update("color", c)}
                className={`size-7 rounded-full ${COLORS[c].dot} ${
                  draft.color === c
                    ? "ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 dark:ring-offset-zinc-900"
                    : ""
                }`}
              />
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">メモ</span>
          <textarea
            rows={3}
            className={inputClass}
            value={draft.memo ?? ""}
            onChange={(e) => update("memo", e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              削除
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
