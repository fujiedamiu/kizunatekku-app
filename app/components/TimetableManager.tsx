"use client";

import { useEffect, useState } from "react";
import { describeError, errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
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
                ? t("tt.editTitle")
                : t("tt.newTitle")
              : t("tt.title")}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
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
                ["mine", t("tt.tabMine")],
                ["search", t("tt.tabSearch")],
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
  onEdit: (timetable: TimetableView) => void;
}) {
  const { t } = useI18n();
  const { timetables, error } = useMyTimetables();
  const owned = (timetables ?? []).filter((tt) => tt.isOwner);
  const subscribed = (timetables ?? []).filter((tt) => !tt.isOwner);

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-rose-600">{errorMessage(t, error)}</p>}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-500">
            {t("tt.ownedHeading")}
          </h3>
          <button
            onClick={onCreate}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t("tt.newButton")}
          </button>
        </div>
        {!timetables ? (
          <p className="py-4 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : owned.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500">{t("tt.noneOwned")}</p>
        ) : (
          owned.map((tt) => (
            <TimetableCard key={tt.id} timetable={tt}>
              <button
                onClick={() => onEdit(tt)}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {t("tt.edit")}
              </button>
              <DeleteButton timetable={tt} />
            </TimetableCard>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-500">
          {t("tt.subscribedHeading")}
        </h3>
        {timetables && subscribed.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500">{t("tt.noneSubscribed")}</p>
        ) : (
          subscribed.map((tt) => (
            <TimetableCard key={tt.id} timetable={tt}>
              <SubscribeButton timetable={tt} />
            </TimetableCard>
          ))
        )}
      </section>
    </div>
  );
}

function SearchTimetables() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TimetableView[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  // 表示中にした/やめた結果を、検索し直さずに反映する
  const { timetables: mine } = useMyTimetables();
  const subscribedIds = new Set(
    (mine ?? []).filter((tt) => tt.subscribed).map((tt) => tt.id),
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
          if (!controller.signal.aborted) setError(e);
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
        placeholder={t("tt.searchPlaceholder")}
        aria-label={t("tt.searchLabel")}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error !== null && (
        <p className="text-sm text-rose-600">
          {describeError(t, error, "searchFailed")}
        </p>
      )}
      {!q ? (
        <p className="py-4 text-center text-sm text-zinc-500">
          {t("tt.searchIntro")}
        </p>
      ) : results === null ? (
        <p className="py-4 text-center text-sm text-zinc-500">
          {t("common.searching")}
        </p>
      ) : results.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">
          {t("tt.searchNoResults", { q })}
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((tt) => {
            const view = { ...tt, subscribed: subscribedIds.has(tt.id) };
            return (
              <TimetableCard key={tt.id} timetable={view}>
                {tt.isOwner ? (
                  <span className="text-xs text-zinc-500">
                    {t("tt.ownAlwaysShown")}
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
  timetable: tt,
  children,
}: {
  timetable: TimetableView;
  children: React.ReactNode;
}) {
  const { t, longDate } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <article className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold break-words">{tt.title}</h4>
          <p className="text-xs text-zinc-500">
            {t("tt.cardMeta", {
              owner: tt.ownerName,
              start: longDate(tt.startDate),
              end: longDate(tt.endDate),
              n: tt.slots.length,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {open ? t("common.close") : t("tt.showContents")}
          </button>
          {children}
        </div>
      </div>
      {open && (
        <TimetableGrid
          periods={tt.periods}
          slotAt={(w, p) =>
            tt.slots.find((s) => s.weekday === w && s.period === p)
          }
        />
      )}
    </article>
  );
}

function SubscribeButton({ timetable: tt }: { timetable: TimetableView }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      await setTimetableSubscribed(tt.id, !tt.subscribed);
    } catch (e) {
      window.alert(describeError(t, e, "changeFailed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-lg px-3 py-1 text-sm font-medium disabled:opacity-50 ${
        tt.subscribed
          ? "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {tt.subscribed ? t("tt.unsubscribe") : t("tt.subscribe")}
    </button>
  );
}

function DeleteButton({ timetable: tt }: { timetable: TimetableView }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!window.confirm(t("tt.deleteConfirm", { title: tt.title }))) return;
    setBusy(true);
    try {
      await deleteTimetable(tt.id);
    } catch (e) {
      window.alert(describeError(t, e, "deleteFailed"));
      setBusy(false);
    }
  };
  return (
    <button
      onClick={remove}
      disabled={busy}
      className="rounded-lg px-3 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10"
    >
      {t("common.delete")}
    </button>
  );
}
