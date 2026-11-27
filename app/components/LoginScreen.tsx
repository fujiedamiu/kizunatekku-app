"use client";

import { useState } from "react";
import { login, register } from "@/lib/auth-store";
import { describeError, errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import {
  STUDENT_ID_PREFIX,
  validateName,
  validateStudentNumber,
} from "@/lib/user";

type Mode = "login" | "register";

/** 初回は名前 + 学籍番号で登録、2 回目以降は学籍番号だけでログイン */
export default function LoginScreen({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const number = studentId.trim();
    const id = `${STUDENT_ID_PREFIX}${number}`;
    const err =
      validateStudentNumber(number) ??
      (mode === "register" ? validateName(name.trim()) : null);
    if (err) {
      setError(errorMessage(t, err.code, err.params));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") await register(name.trim(), id);
      else await login(id);
    } catch (e) {
      setError(describeError(t, e));
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-center text-xl font-bold">{t("app.title")}</h1>

        <div
          role="tablist"
          className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
        >
          {(
            [
              ["login", t("login.tabLogin")],
              ["register", t("login.tabRegister")],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`rounded-lg px-2 py-1.5 text-sm font-medium ${
                mode === m
                  ? "bg-white shadow-sm dark:bg-zinc-800"
                  : "text-zinc-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <label className="block space-y-1">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {t("login.name")}
              </span>
              <input
                autoFocus
                autoComplete="name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("login.namePlaceholder")}
              />
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {t("login.studentId")}
            </span>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-zinc-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900">
              <span
                aria-hidden="true"
                className="flex items-center border-r border-zinc-300 bg-zinc-100 px-3 font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {STUDENT_ID_PREFIX}
              </span>
              <input
                autoFocus={mode === "login"}
                autoComplete="username"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={t("login.studentIdAria", {
                  prefix: STUDENT_ID_PREFIX,
                })}
                aria-describedby="student-id-note"
                className="w-full bg-transparent px-3 py-2 tabular-nums outline-none"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="1234567"
              />
            </div>
            <span
              id="student-id-note"
              className="block text-xs text-amber-700 dark:text-amber-400"
            >
              {t("login.studentIdNote", { prefix: STUDENT_ID_PREFIX })}
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mode === "register"
              ? t("login.submitRegister")
              : t("login.submitLogin")}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500">
          {mode === "register" ? t("login.hintRegister") : t("login.hintLogin")}
        </p>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full text-center text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            {t("login.back")}
          </button>
        )}
      </div>
    </main>
  );
}
