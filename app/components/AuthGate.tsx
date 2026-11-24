"use client";

import { useAuth } from "@/lib/auth-store";
import { useI18n, useLanguageUnchosen } from "@/lib/i18n";
import Calendar from "./Calendar";
import LanguagePicker from "./LanguagePicker";
import LoginScreen from "./LoginScreen";

/**
 * ログインしていればカレンダー、していなければログイン画面を表示する。
 * 言語がまだ選ばれていなければ (初回のみ)、言語の選択画面を重ねて表示する。
 */
export default function AuthGate() {
  const auth = useAuth();
  const { t } = useI18n();
  const unchosen = useLanguageUnchosen();

  return (
    <>
      {auth.status === "loading" ? (
        <div className="flex flex-1 items-center justify-center text-zinc-500">
          {t("common.loading")}
        </div>
      ) : auth.status === "guest" ? (
        <LoginScreen />
      ) : (
        <Calendar key={auth.user.studentId} user={auth.user} />
      )}
      {unchosen && <LanguagePicker firstTime />}
    </>
  );
}
