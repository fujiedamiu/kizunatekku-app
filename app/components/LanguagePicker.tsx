"use client";

import { useEffect, useState } from "react";
import { LANGUAGES, setLang, useI18n, type Lang } from "@/lib/i18n";

type Props = {
  /** 初回表示 (言語を選ぶまで閉じられない) */
  firstTime?: boolean;
  onClose?: () => void;
};

const normalize = (s: string) => s.normalize("NFKC").toLowerCase();

/** 言語を検索して選ぶダイアログ */
export default function LanguagePicker({ firstTime = false, onClose }: Props) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (firstTime || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [firstTime, onClose]);

  const q = normalize(query.trim());
  const shown = LANGUAGES.filter(
    (l) =>
      !q ||
      [l.native, l.english, l.code, ...l.aliases].some((name) => normalize(name).includes(q)),
  );

  const choose = (code: Lang) => {
    setLang(code);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={firstTime ? undefined : onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900"
      >
        <header className="flex items-start gap-2">
          <div className="flex-1">
            <h2 id="language-title" className="text-lg font-semibold">
              🌐 {t("lang.title")}
              {/* 読めない言語が表示されていても分かるよう英語も併記する */}
              {lang !== "en" && (
                <span className="ml-2 text-sm font-normal text-zinc-500">
                  Language
                </span>
              )}
            </h2>
            {firstTime && (
              <p className="mt-1 text-sm text-zinc-500">{t("lang.intro")}</p>
            )}
          </div>
          {!firstTime && onClose && (
            <button
              onClick={onClose}
              aria-label={t("common.close")}
              className="flex size-9 items-center justify-center rounded-lg text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              ×
            </button>
          )}
        </header>

        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && shown.length > 0) {
              e.preventDefault();
              choose(shown[0].code);
            }
          }}
          placeholder={t("lang.searchPlaceholder")}
          aria-label={t("lang.searchPlaceholder")}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900"
        />

        <ul className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1" role="listbox">
          {shown.length === 0 ? (
            <li className="py-6 text-center text-sm text-zinc-500">
              {t("lang.noResults")}
            </li>
          ) : (
            shown.map((l) => (
              <li key={l.code} role="option" aria-selected={l.code === lang}>
                <button
                  onClick={() => choose(l.code)}
                  lang={l.code}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left ${
                    l.code === lang
                      ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{l.native}</span>
                  <span className="text-xs text-zinc-500" lang="en">
                    {l.code !== "en" ? l.english : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
