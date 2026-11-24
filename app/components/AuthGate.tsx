"use client";

import { useAuth } from "@/lib/auth-store";
import Calendar from "./Calendar";
import LoginScreen from "./LoginScreen";

/** ログインしていればカレンダー、していなければログイン画面を表示する */
export default function AuthGate() {
  const auth = useAuth();
  if (auth.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        読み込み中…
      </div>
    );
  }
  if (auth.status === "guest") return <LoginScreen />;
  return <Calendar key={auth.user.studentId} user={auth.user} />;
}
