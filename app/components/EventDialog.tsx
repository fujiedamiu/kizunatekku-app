"use client";

import { useEffect, useState } from "react";
import {
  COLORS,
  NOTIFY_OPTIONS,
  formatNotifyBefore,
  type CalendarEvent,
  type EventColor,
} from "@/lib/calendar";
import { describeError } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { requestNotificationPermission } from "@/lib/notifications";
import {
  deleteEvent,
  saveEvent,
  type CalendarKind,
} from "@/lib/events-store";

type Props = {
  kind: CalendarKind;
  event: CalendarEvent;
  isNew: boolean;
  onClose: () => void;
};

export default function EventDialog({ kind, event, isNew, onClose }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<CalendarEvent>(event);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notifyNote, setNotifyNote] = useState<string | null>(null);

  /** 保存・削除を実行し、成功したら閉じる。失敗したらダイアログに理由を出す */
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (err) {
      setError(describeError(t, err, "saveFailed"));
      setBusy(false);
    }
  };

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
      setError(t("err.eventTitleRequired"));
      return;
    }
    if (!draft.allDay && draft.start && draft.end && draft.end < draft.start) {
      setError(t("err.eventEndBeforeStart"));
      return;
    }
    void run(() =>
      saveEvent(kind, {
        ...draft,
        title,
        memo: draft.memo?.trim() || undefined,
        start: draft.allDay ? undefined : draft.start,
        end: draft.allDay ? undefined : draft.end,
        notifyBefore: draft.allDay ? undefined : draft.notifyBefore,
      }),
    );
  };

  /** 通知をオンにしたら、ブラウザに通知の許可を求める */
  const toggleNotify = async (on: boolean) => {
    update("notifyBefore", on ? (draft.notifyBefore ?? 10) : undefined);
    if (!on) return;
    const permission = await requestNotificationPermission();
    setNotifyNote(
      permission === "granted"
        ? null
        : permission === "unsupported"
          ? t("event.notifyUnsupported")
          : t("event.notifyDenied"),
    );
  };

  const handleDelete = () => {
    if (window.confirm(t("event.deleteConfirm", { title: event.title }))) {
      void run(() => deleteEvent(kind, event.id));
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
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-4 overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 pb-0 shadow-xl dark:bg-zinc-900"
      >
        <h2 id="event-dialog-title" className="text-lg font-semibold">
          {isNew ? t("event.addTitle") : t("event.editTitle")}
          <span className="ml-2 align-middle text-xs font-normal text-zinc-500">
            {t(kind === "shared" ? "calendar.shared" : "calendar.personal")}
          </span>
        </h2>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("event.title")}
          </span>
          <input
            autoFocus
            className={inputClass}
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t("event.titlePlaceholder")}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("event.date")}</span>
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
          {t("common.allDay")}
        </label>

        {!draft.allDay && (
          <div className="flex items-center gap-2">
            <input
              type="time"
              aria-label={t("event.startTime")}
              className={inputClass}
              value={draft.start ?? ""}
              onChange={(e) => update("start", e.target.value)}
            />
            <span className="text-zinc-500">〜</span>
            <input
              type="time"
              aria-label={t("event.endTime")}
              className={inputClass}
              value={draft.end ?? ""}
              onChange={(e) => update("end", e.target.value)}
            />
          </div>
        )}

        <fieldset className="space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
          <legend className="px-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("event.notify")}
          </legend>
          {draft.allDay ? (
            <p className="text-xs text-zinc-500">
              {t("event.notifyAllDay")}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.notifyBefore !== undefined}
                    onChange={(e) => void toggleNotify(e.target.checked)}
                    className="size-4"
                  />
                  {t("event.notifyEnable")}
                </label>
                {draft.notifyBefore !== undefined && (
                  <select
                    aria-label={t("event.notifyWhen")}
                    value={draft.notifyBefore}
                    onChange={(e) =>
                      update("notifyBefore", Number(e.target.value))
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {NOTIFY_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {formatNotifyBefore(m, t)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {draft.notifyBefore !== undefined && notifyNote && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {notifyNote}
                </p>
              )}
              {draft.notifyBefore !== undefined && (
                <p className="text-xs text-zinc-500">
                  {t("event.notifyNote")}
                  {kind === "shared" &&
                    ` ${t("event.notifyNoteShared")}`}
                </p>
              )}
            </>
          )}
        </fieldset>

        <fieldset className="space-y-1">
          <legend className="text-sm text-zinc-600 dark:text-zinc-400">{t("event.color")}</legend>
          <div className="flex gap-2">
            {(Object.keys(COLORS) as EventColor[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-label={t(`color.${c}`)}
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
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("event.memo")}</span>
          <textarea
            rows={3}
            className={inputClass}
            value={draft.memo ?? ""}
            onChange={(e) => update("memo", e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="sticky bottom-0 -mx-5 flex items-center gap-2 border-t border-zinc-200 bg-white px-5 py-3 dark:border-zinc-700 dark:bg-zinc-900">
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              {t("common.delete")}
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg disabled:opacity-50 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
