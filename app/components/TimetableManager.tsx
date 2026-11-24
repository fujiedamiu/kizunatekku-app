"use client";

import { useEffect, useState } from "react";
import { formatLongDate } from "@/lib/calendar";
import type { TimetableView } from "@/lib/timetable";
import {
  deleteTimetable,
  searchTimetables,
  setTimetableSubscribed,
  useMyTimetables,
} from "@/lib/timetable-store";
import TimetableEditor, { TimetableGrid, emptyTimetable } from "./TimetableEditor";

type Props = {
  today: string;
  onClose: () => void;
};

type Screen =
  | { name: "mine" }
  | { name: "search" }
  | { name: "edit"; timetable?: TimetableView };

/** 時間割の一覧・作成・編集・検索をまとめた画面 */
export default function TimetableManager({ today, onClose }: Props) {
  const [screen, setScreen] = useState<Screen>({ name: "mine" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-3xl flex-col bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl dark:bg-zinc-900"
      >
        <header className="flex items-center gap-2 border-b border-zinc-200 p-4 dark:border-zinc-800">
          <h2 id="timetable-title" className="mr-auto text-lg font-semibold">
            {screen.name === "edit"
              ? screen.timetable
                ? "時間割を編集"
                : "新しい時間割"
              : "時間割"}
          </h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="flex size-9 items-center justify-center rounded-lg text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ×
          </button>
        </header>

        {screen.name !== "edit" && (
          <div
            role="tablist"
            className="flex gap-1 border-b border-zinc-200 px-4 dark:border-zinc-800"
          >
            {(
              [
                ["mine", "自分の時間割"],
                ["search", "時間割を探す"],
              ] as const
            ).map(([name, label]) => (
              <button
                key={name}
                role="tab"
                aria-selected={screen.name === name}
                onClick={() => setScreen({ name } as Screen)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  screen.name === name
                    ? "border-blue-600 text-blue-700 dark:text-blue-300"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {screen.name === "mine" && (
            <MyTimetables
              onCreate={() => setScreen({ name: "edit" })}
              onEdit={(timetable) => setScreen({ name: "edit", timetable })}
            />
          )}
          {screen.name === "search" && <SearchTimetables />}
          {screen.name === "edit" && (
            <TimetableEditor
              timetableId={screen.timetable?.id}
              initial={screen.timetable ?? emptyTimetable(today)}
              onDone={() => setScreen({ name: "mine" })}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function MyTimetables({
  onCreate,
  onEdit,
}: {
  onCreate: () => void;
  onEdit: (t: TimetableView) => void;
}) {
  const { timetables, error } = useMyTimetables();
  const owned = (timetables ?? []).filter((t) => t.isOwner);
  const subscribed = (timetables ?? []).filter((t) => !t.isOwner);

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-500">
            自分が作った時間割
          </h3>
          <button
            onClick={onCreate}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            ＋ 新しい時間割
          </button>
        </div>
        {!timetables ? (
          <p className="py-4 text-sm text-zinc-500">読み込み中…</p>
        ) : owned.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500">
            まだ時間割がありません。「＋ 新しい時間割」から作成できます。
          </p>
        ) : (
          owned.map((t) => (
            <TimetableCard key={t.id} timetable={t}>
              <button
                onClick={() => onEdit(t)}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                編集
              </button>
              <DeleteButton timetable={t} />
            </TimetableCard>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-500">
          表示中の他の人の時間割
        </h3>
        {timetables && subscribed.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500">
            「時間割を探す」から他の人の時間割を表示できます。
          </p>
        ) : (
          subscribed.map((t) => (
            <TimetableCard key={t.id} timetable={t}>
              <SubscribeButton timetable={t} />
            </TimetableCard>
          ))
        )}
      </section>
    </div>
  );
}

function SearchTimetables() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TimetableView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 表示中にした/やめた結果を、検索し直さずに反映する
  const { timetables: mine } = useMyTimetables();
  const subscribedIds = new Set(
    (mine ?? []).filter((t) => t.subscribed).map((t) => t.id),
  );

  const q = query.trim();
  useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchTimetables(q, controller.signal)
        .then((r) => {
          setResults(r);
          setError(null);
        })
        .catch((e: unknown) => {
          if (!controller.signal.aborted)
            setError(e instanceof Error ? e.message : "検索できませんでした");
        });
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [q]);

  return (
    <div className="space-y-4">
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="時間割の名前・作成者・科目名で検索"
        aria-label="時間割を検索"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!q ? (
        <p className="py-4 text-center text-sm text-zinc-500">
          キーワードを入力すると、みんなが作った時間割を探せます。
        </p>
      ) : results === null ? (
        <p className="py-4 text-center text-sm text-zinc-500">検索中…</p>
      ) : results.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">
          「{q}」に一致する時間割はありません
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((t) => {
            const view = { ...t, subscribed: subscribedIds.has(t.id) };
            return (
              <TimetableCard key={t.id} timetable={view}>
                {t.isOwner ? (
                  <span className="text-xs text-zinc-500">
                    自分の時間割（常に表示）
                  </span>
                ) : (
                  <SubscribeButton timetable={view} />
                )}
              </TimetableCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 時間割 1 件のカード。「中身を見る」で表を開ける */
function TimetableCard({
  timetable: t,
  children,
}: {
  timetable: TimetableView;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold break-words">{t.title}</h4>
          <p className="text-xs text-zinc-500">
            作成：{t.ownerName}・{formatLongDate(t.startDate)}〜
            {formatLongDate(t.endDate)}・{t.slots.length}コマ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {open ? "閉じる" : "中身を見る"}
          </button>
          {children}
        </div>
      </div>
      {open && (
        <TimetableGrid
          periods={t.periods}
          slotAt={(w, p) =>
            t.slots.find((s) => s.weekday === w && s.period === p)
          }
        />
      )}
    </article>
  );
}

function SubscribeButton({ timetable: t }: { timetable: TimetableView }) {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      await setTimetableSubscribed(t.id, !t.subscribed);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "変更できませんでした");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-lg px-3 py-1 text-sm font-medium disabled:opacity-50 ${
        t.subscribed
          ? "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {t.subscribed ? "表示をやめる" : "自分のカレンダーに表示"}
    </button>
  );
}

function DeleteButton({ timetable: t }: { timetable: TimetableView }) {
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (
      !window.confirm(
        `「${t.title}」を削除しますか？\n表示している他の人のカレンダーからも消えます。`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteTimetable(t.id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "削除できませんでした");
      setBusy(false);
    }
  };
  return (
    <button
      onClick={remove}
      disabled={busy}
      className="rounded-lg px-3 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10"
    >
      削除
    </button>
  );
}
