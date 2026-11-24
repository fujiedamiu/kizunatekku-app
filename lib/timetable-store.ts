import { useSyncExternalStore } from "react";
import { AppError, errorFromResponse, type ErrorCode } from "./errors";
import type { TimetableInput, TimetableView } from "./timetable";

export type TimetablesState = {
  /** 自分が作った時間割 + 表示中の他の人の時間割。読み込み前は null */
  timetables: TimetableView[] | null;
  error: ErrorCode | null;
};

const POLL_MS = 60_000;

let state: TimetablesState = { timetables: null, error: null };
const listeners = new Set<() => void>();
let stopPolling: (() => void) | null = null;

const set = (next: TimetablesState) => {
  state = next;
  listeners.forEach((l) => l());
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch (err) {
    if (init?.signal?.aborted) throw err;
    throw new AppError("server");
  }
  if (!res.ok) throw await errorFromResponse(res);
  return (await res.json()) as T;
}

/** 自分の時間割一覧を読み直す */
export async function refreshTimetables() {
  try {
    const timetables = await request<TimetableView[]>("/api/me/timetables");
    set({ timetables, error: null });
  } catch {
    set({ ...state, error: "timetablesLoad" });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refreshTimetables();
    const timer = window.setInterval(refreshTimetables, POLL_MS);
    const onFocus = () => void refreshTimetables();
    window.addEventListener("focus", onFocus);
    stopPolling = () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopPolling?.();
      stopPolling = null;
    }
  };
}

const SERVER_STATE: TimetablesState = { timetables: null, error: null };

export function useMyTimetables(): TimetablesState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

/** ログアウト時などに、前のユーザーの時間割を消しておく */
export function clearTimetables() {
  set({ timetables: null, error: null });
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export async function createTimetable(input: TimetableInput) {
  await request("/api/timetables", json("POST", input));
  await refreshTimetables();
}

export async function updateTimetable(id: string, input: TimetableInput) {
  await request(`/api/timetables/${encodeURIComponent(id)}`, json("PUT", input));
  await refreshTimetables();
}

export async function deleteTimetable(id: string) {
  await request(`/api/timetables/${encodeURIComponent(id)}`, json("DELETE"));
  await refreshTimetables();
}

/** 他の人の時間割を自分のカレンダーに表示する / やめる */
export async function setTimetableSubscribed(id: string, subscribed: boolean) {
  await request(
    `/api/timetables/${encodeURIComponent(id)}/subscription`,
    json(subscribed ? "PUT" : "DELETE"),
  );
  await refreshTimetables();
}

export function searchTimetables(query: string, signal?: AbortSignal) {
  return request<TimetableView[]>(
    `/api/timetables?q=${encodeURIComponent(query)}`,
    { signal },
  );
}
