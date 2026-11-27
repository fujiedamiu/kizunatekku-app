import { useSyncExternalStore } from "react";
import { errorFromResponse } from "./errors";
import { setEventsUser } from "./events-store";
import { clearTimetables } from "./timetable-store";
import type { User } from "./user";

export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "user"; user: User };

let state: AuthState = { status: "loading" };
let started = false;
const listeners = new Set<() => void>();

const set = (next: AuthState) => {
  // ユーザーが変わったら、個人カレンダーの保存先と時間割を切り替える
  if (next.status === "user") setEventsUser(next.user.studentId);
  else {
    setEventsUser(null);
    clearTimetables();
  }
  state = next;
  listeners.forEach((l) => l());
};

async function load() {
  try {
    const res = await fetch("/api/auth", { cache: "no-store" });
    const body = (await res.json()) as { user: User | null };
    set(body.user ? { status: "user", user: body.user } : { status: "guest" });
  } catch {
    set({ status: "guest" });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void load();
  }
  return () => {
    listeners.delete(listener);
  };
}

const SERVER_STATE: AuthState = { status: "loading" };

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

async function post(body: Record<string, string>) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFromResponse(res);
  const data = (await res.json()) as { user: User };
  set({ status: "user", user: data.user });
}

/** 初回登録 (名前 + 学籍番号) */
export const register = (name: string, studentId: string) =>
  post({ mode: "register", name, studentId });

/** 2 回目以降のログイン (学籍番号のみ) */
export const login = (studentId: string) => post({ mode: "login", studentId });

export async function logout() {
  await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
  set({ status: "guest" });
}
