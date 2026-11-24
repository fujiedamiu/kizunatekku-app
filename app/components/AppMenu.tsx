"use client";

import { useEffect, useRef, useState } from "react";
import { CALENDAR_LABELS, type CalendarKind } from "@/lib/events-store";
import type { User } from "@/lib/user";

type Props = {
  user: User;
  kind: CalendarKind;
  onSelectKind: (kind: CalendarKind) => void;
  onShowToday: () => void;
  onGoToday: () => void;
  onOpenTimetables: () => void;
  onLogout: () => void;
};

const KINDS: CalendarKind[] = ["shared", "personal"];

/** ヘッダー左上のメニューボタンと、左から開くメニュー */
export default function AppMenu({
  user,
  kind,
  onSelectKind,
  onShowToday,
  onGoToday,
  onOpenTimetables,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /** メニューの項目を選んだら、処理をしてメニューを閉じる */
  const choose = (action: () => void) => () => {
    action();
    setOpen(false);
  };

  const itemClass = (active = false) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      active
        ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
        : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
    }`;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="-ml-1 flex size-9 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={close}>
          <nav
            role="dialog"
            aria-modal="true"
            aria-label="メニュー"
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-72 max-w-[85vw] flex-col gap-6 bg-white p-4 shadow-xl dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">メニュー</span>
              <button
                autoFocus
                onClick={close}
                aria-label="メニューを閉じる"
                className="flex size-9 items-center justify-center rounded-lg text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ×
              </button>
            </div>

            <section className="space-y-1">
              <h2 className="px-3 text-xs font-semibold text-zinc-500">
                カレンダー
              </h2>
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={choose(() => onSelectKind(k))}
                  aria-current={kind === k ? "true" : undefined}
                  className={itemClass(kind === k)}
                >
                  <span aria-hidden="true">{k === "shared" ? "👥" : "👤"}</span>
                  {CALENDAR_LABELS[k]}カレンダー
                </button>
              ))}
            </section>

            <section className="space-y-1">
              <h2 className="px-3 text-xs font-semibold text-zinc-500">
                表示
              </h2>
              <button onClick={choose(onShowToday)} className={itemClass()}>
                <span aria-hidden="true">📋</span>
                本日の予定
              </button>
              <button onClick={choose(onGoToday)} className={itemClass()}>
                <span aria-hidden="true">📅</span>
                今日の日付に移動
              </button>
            </section>

            <section className="space-y-1">
              <h2 className="px-3 text-xs font-semibold text-zinc-500">
                時間割
              </h2>
              <button onClick={choose(onOpenTimetables)} className={itemClass()}>
                <span aria-hidden="true">📚</span>
                時間割の作成・検索
              </button>
            </section>

            <section className="mt-auto space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <div className="px-3">
                <p className="truncate font-medium">{user.name}</p>
                <p className="text-xs text-zinc-500 tabular-nums">
                  {user.studentId}
                </p>
              </div>
              <button
                onClick={choose(() => {
                  if (window.confirm("ログアウトしますか？")) onLogout();
                })}
                className={itemClass()}
              >
                <span aria-hidden="true">🚪</span>
                ログアウト
              </button>
            </section>
          </nav>
        </div>
      )}
    </>
  );
}
