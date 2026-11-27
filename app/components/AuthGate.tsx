"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { useI18n, useLanguageUnchosen } from "@/lib/i18n";
import Calendar from "./Calendar";
import LanguagePicker from "./LanguagePicker";
import LoginScreen from "./LoginScreen";

/**
 * ログインしていればカレンダー (全機能)。
 * していなければ共通カレンダーを見るだけの画面を出し、「ログイン」でログイン画面へ。
 * 言語がまだ選ばれていなければ (初回のみ)、言語の選択画面を重ねて表示する。
 */
export default function AuthGate() {
  const auth = useAuth();
  const { t } = useI18n();
  const unchosen = useLanguageUnchosen();
  const [loginOpen, setLoginOpen] = useState(false);

  // ログインしたら、次にログアウトしたときは見るだけの画面に戻す
  if (auth.status === "user" && loginOpen) setLoginOpen(false);

  return (
    <>
      {auth.status === "loading" ? (
        <div className="flex flex-1 items-center justify-center text-zinc-500">
          {t("common.loading")}
        </div>
      ) : auth.status === "guest" ? (
        loginOpen ? (
          <LoginScreen onBack={() => setLoginOpen(false)} />
        ) : (
          <Calendar key="guest" user={null} onLogin={() => setLoginOpen(true)} />
        )
      ) : (
        <Calendar key={auth.user.studentId} user={auth.user} />
      )}
      {unchosen && <LanguagePicker firstTime />}
    </>
  );
}
