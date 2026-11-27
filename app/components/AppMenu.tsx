"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarKind } from "@/lib/events-store";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import type { User } from "@/lib/user";
import LanguagePicker from "./LanguagePicker";

type Props = {
  /** null = 未ログイン (共通カレンダーを見るだけ) */
  user: User | null;
  onLogin?: () => void;
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
  onLogin,
}: Props) {
  const kinds: CalendarKind[] = user ? KINDS : ["shared"];
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const closeLanguage = useCallback(() => setLanguageOpen(false), []);
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

  const currentLanguage = LANGUAGES.find((l) => l.code === lang)?.native;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(true)}
        aria-label={t("menu.open")}
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
            aria-label={t("menu.title")}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto overscroll-contain bg-white p-4 shadow-xl dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">{t("menu.title")}</span>
              <button
                autoFocus
                onClick={close}
                aria-label={t("menu.close")}
                className="flex size-9 items-center justify-center rounded-lg text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ×
              </button>
            </div>

            <section className="space-y-1">
              <h2 className="px-3 text-xs font-semibold text-zinc-500">
                {t("menu.calendars")}
              </h2>
              {kinds.map((k) => (
                <button
                  key={k}
                  onClick={choose(() => onSelectKind(k))}
                  aria-current={kind === k ? "true" : undefined}
                  className={itemClass(kind === k)}
                >
                  <span aria-hidden="true">{k === "shared" ? "👥" : "👤"}</span>
                  {t(k === "shared" ? "calendar.shared" : "calendar.personal")}
                </button>
              ))}
            </section>

            <section className="space-y-1">
              <h2 className="px-3 text-xs font-semibold text-zinc-500">
                {t("menu.view")}
              </h2>
              <button onClick={choose(onShowToday)} className={itemClass()}>
                <span aria-hidden="true">📋</span>
                {t("menu.todaySchedule")}
              </button>
              <button onClick={choose(onGoToday)} className={itemClass()}>
                <span aria-hidden="true">📅</span>
                {t("menu.goToday")}
              </button>
            </section>

            {user && (
              <section className="space-y-1">
                <h2 className="px-3 text-xs font-semibold text-zinc-500">
                  {t("menu.timetable")}
                </h2>
                <button
                  onClick={choose(onOpenTimetables)}
                  className={itemClass()}
                >
                  <span aria-hidden="true">📚</span>
                  {t("menu.timetableManage")}
                </button>
              </section>
            )}

            <section className="space-y-1">
              <h2 className="px-3 text-xs font-semibold text-zinc-500">
                {t("menu.settings")}
              </h2>
              <button
                onClick={choose(() => setLanguageOpen(true))}
                className={itemClass()}
              >
                <span aria-hidden="true">🌐</span>
                <span className="flex-1">
                  {t("menu.language")}
                  {lang !== "en" && (
                    <span className="text-zinc-400"> / Language</span>
                  )}
                </span>
                <span className="text-xs text-zinc-500">{currentLanguage}</span>
              </button>
            </section>

            {!user ? (
              <section className="mt-auto space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <p className="px-3 text-xs text-zinc-500">{t("guest.notice")}</p>
                <button
                  onClick={choose(() => onLogin?.())}
                  className={itemClass()}
                >
                  <span aria-hidden="true">🔑</span>
                  {t("login.tabLogin")}
                </button>
              </section>
            ) : (
            <section className="mt-auto space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <div className="px-3">
                <p className="truncate font-medium">{user.name}</p>
                <p className="text-xs text-zinc-500 tabular-nums">
                  {user.studentId}
                </p>
              </div>
              <button
                onClick={choose(() => {
                  if (window.confirm(t("menu.logoutConfirm"))) onLogout();
                })}
                className={itemClass()}
              >
                <span aria-hidden="true">🚪</span>
                {t("menu.logout")}
              </button>
            </section>
            )}
          </nav>
        </div>
      )}

      {languageOpen && <LanguagePicker onClose={closeLanguage} />}
    </>
  );
}
