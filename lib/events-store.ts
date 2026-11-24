import { useSyncExternalStore } from "react";
import { toDateKey, type CalendarEvent } from "./calendar";

const STORAGE_KEY = "kizunatekku.events.v1";

let cache: CalendarEvent[] | null = null;
const listeners = new Set<() => void>();

function read(): CalendarEvent[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as CalendarEvent[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(events: CalendarEvent[]) {
  cache = events;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // 保存できない環境 (プライベートモード等) ではメモリ上だけで保持する
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 別タブでの変更も反映する
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** サーバー描画時は null、ブラウザでは保存済みの予定一覧を返す */
export function useEvents(): CalendarEvent[] | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function saveEvent(event: CalendarEvent) {
  const events = read();
  const exists = events.some((e) => e.id === event.id);
  write(
    exists
      ? events.map((e) => (e.id === event.id ? event : e))
      : [...events, event],
  );
}

export function deleteEvent(id: string) {
  write(read().filter((e) => e.id !== id));
}

function subscribeToday(listener: () => void) {
  const timer = window.setInterval(listener, 60_000);
  return () => window.clearInterval(timer);
}

/** 今日の日付キー。サーバー描画時は null (日付はブラウザの時刻で決める) */
export function useToday(): string | null {
  return useSyncExternalStore(
    subscribeToday,
    () => toDateKey(new Date()),
    () => null,
  );
}
