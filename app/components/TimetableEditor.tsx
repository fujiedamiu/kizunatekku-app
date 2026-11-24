"use client";

import { useState } from "react";
import { COLORS, type EventColor } from "@/lib/calendar";
import { describeError, errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_PERIODS,
  MAX_PERIODS,
  TIMETABLE_WEEKDAYS,
  parseTimetableInput,
  type Period,
  type TimetableInput,
  type TimetableSlot,
} from "@/lib/timetable";
import { createTimetable, updateTimetable } from "@/lib/timetable-store";

type Props = {
  /** 編集する時間割。新規作成なら undefined */
  timetableId?: string;
  initial: TimetableInput;
  onDone: () => void;
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900";

export function emptyTimetable(today: string): TimetableInput {
  const d = new Date(`${today}T00:00:00`);
  d.setMonth(d.getMonth() + 4);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    title: "",
    startDate: today,
    endDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    periods: DEFAULT_PERIODS,
    slots: [],
  };
}

type Cell = { weekday: number; period: number };

/** 時間割の作成・編集画面 */
export default function TimetableEditor({
  timetableId,
  initial,
  onDone,
}: Props) {
  const { t, weekdayLong } = useI18n();
  const [draft, setDraft] = useState<TimetableInput>(initial);
  const [cell, setCell] = useState<Cell | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const slotAt = (weekday: number, period: number) =>
    draft.slots.find((s) => s.weekday === weekday && s.period === period);

  const setPeriod = (i: number, patch: Partial<Period>) =>
    setDraft((d) => ({
      ...d,
      periods: d.periods.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }));

  const addPeriod = () =>
    setDraft((d) => {
      const last = d.periods.at(-1) ?? { start: "09:00", end: "10:30" };
      return { ...d, periods: [...d.periods, { start: last.end, end: last.end }] };
    });

  /** 最後の時限を消す (その時限の授業も消える) */
  const removeLastPeriod = () =>
    setDraft((d) => {
      const last = d.periods.length - 1;
      return {
        ...d,
        periods: d.periods.slice(0, last),
        slots: d.slots.filter((s) => s.period !== last),
      };
    });

  const saveSlot = (slot: TimetableSlot | null, at: Cell) =>
    setDraft((d) => {
      const others = d.slots.filter(
        (s) => !(s.weekday === at.weekday && s.period === at.period),
      );
      return { ...d, slots: slot ? [...others, slot] : others };
    });

  const handleSave = async () => {
    const parsed = parseTimetableInput(draft);
    if (!parsed.ok) {
      setError(errorMessage(t, parsed.error.code, parsed.error.params));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (timetableId) await updateTimetable(timetableId, parsed.value);
      else await createTimetable(parsed.value);
      onDone();
    } catch (e) {
      setError(describeError(t, e, "saveFailed"));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <label className="block space-y-1">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("tte.name")}
        </span>
        <input
          autoFocus
          className={inputClass}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder={t("tte.namePlaceholder")}
        />
      </label>

      <div className="space-y-1">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("tte.term")}</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label={t("tte.startDate")}
            className={inputClass}
            value={draft.startDate}
            onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
          />
          <span className="text-zinc-500">〜</span>
          <input
            type="date"
            aria-label={t("tte.endDate")}
            className={inputClass}
            value={draft.endDate}
            onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("tte.periodsHeading")}
        </span>
        <ul className="grid gap-2 sm:grid-cols-2">
          {draft.periods.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-sm font-medium">{t("tte.period", { n: i + 1 })}</span>
              <input
                type="time"
                aria-label={t("tte.periodStart", { n: i + 1 })}
                className={inputClass}
                value={p.start}
                onChange={(e) => setPeriod(i, { start: e.target.value })}
              />
              <span className="text-zinc-500">〜</span>
              <input
                type="time"
                aria-label={t("tte.periodEnd", { n: i + 1 })}
                className={inputClass}
                value={p.end}
                onChange={(e) => setPeriod(i, { end: e.target.value })}
              />
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addPeriod}
            disabled={draft.periods.length >= MAX_PERIODS}
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t("tte.addPeriod")}
          </button>
          <button
            type="button"
            onClick={removeLastPeriod}
            disabled={draft.periods.length <= 1}
            className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t("tte.removePeriod")}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("tte.classesHeading")}
        </span>
        <TimetableGrid
          periods={draft.periods}
          slotAt={slotAt}
          onCellClick={(weekday, period) => setCell({ weekday, period })}
        />
      </div>

      {cell && (
        <SlotForm
          key={`${cell.weekday}:${cell.period}`}
          label={t("tte.slotHeading", {
            day: weekdayLong(cell.weekday),
            period: t("tte.period", { n: cell.period + 1 }),
          })}
          slot={slotAt(cell.weekday, cell.period)}
          onSave={(slot) => {
            saveSlot(
              slot && { ...slot, weekday: cell.weekday, period: cell.period },
              cell,
            );
            setCell(null);
          }}
          onCancel={() => setCell(null)}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {timetableId ? t("common.save") : t("tte.create")}
        </button>
      </div>
    </div>
  );
}

/** 曜日 × 時限の表。onCellClick を渡すと各マスがボタンになる */
export function TimetableGrid({
  periods,
  slotAt,
  onCellClick,
}: {
  periods: Period[];
  slotAt: (weekday: number, period: number) => TimetableSlot | undefined;
  onCellClick?: (weekday: number, period: number) => void;
}) {
  const { t, weekdayShort, weekdayLong } = useI18n();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] table-fixed border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-16" />
            {TIMETABLE_WEEKDAYS.map((w) => (
              <th
                key={w}
                className={`py-1 font-medium ${w === 6 ? "text-blue-600" : "text-zinc-500"}`}
              >
                {weekdayShort(w)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p, i) => (
            <tr key={i}>
              <th className="border-t border-zinc-100 py-1 pr-1 text-left align-top font-normal text-zinc-500 dark:border-zinc-800">
                <span className="block font-medium text-zinc-700 dark:text-zinc-300">
                  {t("tte.period", { n: i + 1 })}
                </span>
                <span className="tabular-nums">{p.start}</span>
              </th>
              {TIMETABLE_WEEKDAYS.map((w) => {
                const slot = slotAt(w, i);
                const content = slot ? (
                  <span
                    className={`flex h-full flex-col rounded-md px-1.5 py-1 text-left ${COLORS[slot.color].chip}`}
                  >
                    <span className="line-clamp-2 font-medium">
                      {slot.subject}
                    </span>
                    {slot.room && (
                      <span className="truncate opacity-75">{slot.room}</span>
                    )}
                  </span>
                ) : onCellClick ? (
                  <span className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-700">
                    ＋
                  </span>
                ) : null;
                return (
                  <td
                    key={w}
                    className="h-14 border-t border-zinc-100 p-0.5 dark:border-zinc-800"
                  >
                    {onCellClick ? (
                      <button
                        type="button"
                        onClick={() => onCellClick(w, i)}
                        aria-label={
                          slot
                            ? t("tte.cell", {
                                day: weekdayLong(w),
                                period: t("tte.period", { n: i + 1 }),
                                subject: slot.subject,
                              })
                            : t("tte.cellEmpty", {
                                day: weekdayLong(w),
                                period: t("tte.period", { n: i + 1 }),
                              })
                        }
                        className="h-full w-full rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {content}
                      </button>
                    ) : (
                      content
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 1 コマ分の入力フォーム */
function SlotForm({
  label,
  slot,
  onSave,
  onCancel,
}: {
  label: string;
  slot?: TimetableSlot;
  onSave: (slot: TimetableSlot | null) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [subject, setSubject] = useState(slot?.subject ?? "");
  const [color, setColor] = useState<EventColor>(slot?.color ?? "blue");
  const [room, setRoom] = useState(slot?.room ?? "");
  const [memo, setMemo] = useState(slot?.memo ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!subject.trim()) {
      setError(t("err.subjectRequired"));
      return;
    }
    onSave({
      id: slot?.id ?? crypto.randomUUID(),
      weekday: slot?.weekday ?? 0,
      period: slot?.period ?? 0,
      subject: subject.trim(),
      color,
      room: room.trim() || undefined,
      memo: memo.trim() || undefined,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-500/30 dark:bg-blue-500/5">
      <h4 className="font-semibold">{label}</h4>
      <input
        autoFocus
        className={inputClass}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={t("tte.subjectPlaceholder")}
        aria-label={t("tte.subject")}
      />
      <input
        className={inputClass}
        value={room}
        onChange={(e) => setRoom(e.target.value)}
        placeholder={t("tte.roomPlaceholder")}
        aria-label={t("tte.room")}
      />
      <textarea
        rows={2}
        className={inputClass}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder={t("tte.memoPlaceholder")}
        aria-label={t("event.memo")}
      />
      <div className="flex gap-2" role="group" aria-label={t("event.color")}>
        {(Object.keys(COLORS) as EventColor[]).map((c) => (
          <button
            key={c}
            type="button"
            aria-label={t(`color.${c}`)}
            aria-pressed={color === c}
            onClick={() => setColor(c)}
            className={`size-7 rounded-full ${COLORS[c].dot} ${
              color === c
                ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-900"
                : ""
            }`}
          />
        ))}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex items-center gap-2">
        {slot && (
          <button
            type="button"
            onClick={() => onSave(null)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            {t("tte.clearSlot")}
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
