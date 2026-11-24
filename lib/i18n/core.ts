/** 翻訳と言語の一覧 (React を使わないので、サーバー側からも読み込める) */
import ja, { type MessageKey, type Messages } from "./messages/ja";
import en from "./messages/en";
import zhCN from "./messages/zh-CN";
import zhTW from "./messages/zh-TW";
import ko from "./messages/ko";
import vi from "./messages/vi";
import ne from "./messages/ne";
import id from "./messages/id";

export type { MessageKey } from "./messages/ja";

export type Lang = "ja" | "en" | "zh-CN" | "zh-TW" | "ko" | "vi" | "ne" | "id";

export type LanguageInfo = {
  code: Lang;
  /** その言語自身での名前 */
  native: string;
  /** 英語での名前 */
  english: string;
  /** 検索用の別名 (日本語名・英語名など) */
  aliases: string[];
};

/** 対応言語の一覧 (言語選択の表示順) */
export const LANGUAGES: LanguageInfo[] = [
  { code: "ja", native: "日本語", english: "Japanese", aliases: ["Japanese", "nihongo", "にほんご"] },
  { code: "en", native: "English", english: "English", aliases: ["英語", "えいご", "eigo"] },
  {
    code: "zh-CN",
    native: "简体中文",
    english: "Chinese (Simplified)",
    aliases: ["中文", "汉语", "Chinese (Simplified)", "中国語（簡体字）", "ちゅうごくご"],
  },
  {
    code: "zh-TW",
    native: "繁體中文",
    english: "Chinese (Traditional)",
    aliases: ["中文", "漢語", "Chinese (Traditional)", "中国語（繁体字）", "台湾", "ちゅうごくご"],
  },
  { code: "ko", native: "한국어", english: "Korean", aliases: ["Korean", "韓国語", "かんこくご"] },
  { code: "vi", native: "Tiếng Việt", english: "Vietnamese", aliases: ["Vietnamese", "ベトナム語", "Tieng Viet"] },
  { code: "ne", native: "नेपाली", english: "Nepali", aliases: ["Nepali", "ネパール語", "Nepalese"] },
  {
    code: "id",
    native: "Bahasa Indonesia",
    english: "Indonesian",
    aliases: ["Indonesian", "インドネシア語", "Indonesia"],
  },
];

const MESSAGES: Record<Lang, Messages> = {
  ja,
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  ko,
  vi,
  ne,
  id,
};

export const isLang = (v: unknown): v is Lang =>
  typeof v === "string" && v in MESSAGES;

/** {name} を値で置き換える */
function format(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (all, name: string) =>
    name in params ? String(params[name]) : all,
  );
}

export type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

export function translator(lang: Lang): Translate {
  const messages = MESSAGES[lang];
  return (key, params) =>
    format(messages[key] ?? ja[key] ?? ja["err.generic"], params);
}

/** サーバー側のエラーメッセージなど、日本語の文言が必要なとき用 */
export const tJa = translator("ja");

// ---------------------------------------------------------------------------
// 日付の表示
// ---------------------------------------------------------------------------

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export type I18n = {
  lang: Lang;
  t: Translate;
  /** 2026年11月24日（火） など */
  longDate: (key: string) => string;
  /** 2026年11月 など */
  monthTitle: (year: number, month: number) => string;
  /** 0=日 … 6=土 の短い曜日名 */
  weekdayShort: (dow: number) => string;
  /** 0=日 … 6=土 の曜日名 */
  weekdayLong: (dow: number) => string;
};

const cache = new Map<Lang, I18n>();

export function i18nFor(lang: Lang): I18n {
  const hit = cache.get(lang);
  if (hit) return hit;
  const long = new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const month = new Intl.DateTimeFormat(lang, { year: "numeric", month: "long" });
  const wdShort = new Intl.DateTimeFormat(lang, { weekday: "short" });
  const wdLong = new Intl.DateTimeFormat(lang, { weekday: "long" });
  // 2023-01-01 は日曜日
  const dayOf = (dow: number) => new Date(2023, 0, 1 + dow);
  const value: I18n = {
    lang,
    t: translator(lang),
    longDate: (key) => long.format(parseKey(key)),
    monthTitle: (y, m) => month.format(new Date(y, m, 1)),
    weekdayShort: (dow) => wdShort.format(dayOf(dow)),
    weekdayLong: (dow) => wdLong.format(dayOf(dow)),
  };
  cache.set(lang, value);
  return value;
}
