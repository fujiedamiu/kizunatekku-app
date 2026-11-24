import { useSyncExternalStore } from "react";
import { i18nFor, isLang, type I18n, type Lang } from "./core";

export * from "./core";

// ---------------------------------------------------------------------------
// 選択中の言語 (ブラウザごとに保存。未選択なら初回に選択画面を出す)
// ---------------------------------------------------------------------------

const LANG_KEY = "kizunatekku.lang";
const listeners = new Set<() => void>();
let memory: Lang | null = null;

function readChosen(): Lang | null {
  if (memory) return memory;
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    if (isLang(v)) return v;
  } catch {
    // 読めない場合は未選択として扱う
  }
  return null;
}

/** 未選択のとき、ブラウザの言語設定から近いものを選ぶ */
function guessLang(): Lang {
  const prefs =
    typeof navigator === "undefined"
      ? []
      : [...(navigator.languages ?? []), navigator.language];
  for (const p of prefs) {
    if (!p) continue;
    const lower = p.toLowerCase();
    if (lower.startsWith("zh")) {
      return /tw|hk|mo|hant/.test(lower) ? "zh-TW" : "zh-CN";
    }
    const base = lower.split("-")[0];
    if (isLang(base)) return base;
  }
  return "ja";
}

function applyDocumentLang(lang: Lang) {
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLang(lang: Lang) {
  memory = lang;
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // 保存できなくてもこのページ内では切り替わる
  }
  applyDocumentLang(lang);
  listeners.forEach((l) => l());
}

/** 言語がまだ選ばれていなければ true (サーバー描画時は false) */
export function useLanguageUnchosen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readChosen() === null,
    () => false,
  );
}

export function useLang(): Lang {
  const lang = useSyncExternalStore(
    subscribe,
    () => readChosen() ?? guessLang(),
    () => "ja" as Lang,
  );
  applyDocumentLang(lang);
  return lang;
}



/** 選択中の言語の翻訳関数と日付の表示関数 */
export function useI18n(): I18n {
  return i18nFor(useLang());
}
