import { useSyncExternalStore } from "react";
import { parseEvent, toDateKey, type CalendarEvent } from "./calendar";

/** shared: 全員で共有する共通カレンダー / personal: このブラウザだけの個人カレンダー */
export type CalendarKind = "shared" | "personal";

export const CALENDAR_LABELS: Record<CalendarKind, string> = {
  shared: "共通",
  personal: "個人",
};

export type EventsState = {
  /** 読み込み前は null */
  events: CalendarEvent[] | null;
  error: string | null;
};

type Store = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => EventsState;
  save: (event: CalendarEvent) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

function createListeners() {
  const listeners = new Set<() => void>();
  return {
    add: (l: () => void) => listeners.add(l),
    delete: (l: () => void) => listeners.delete(l),
    get size() {
      return listeners.size;
    },
    notify: () => listeners.forEach((l) => l()),
  };
}

const upsert = (events: CalendarEvent[], event: CalendarEvent) =>
  events.some((e) => e.id === event.id)
    ? events.map((e) => (e.id === event.id ? event : e))
    : [...events, event];

// ---------------------------------------------------------------------------
// 個人カレンダー: localStorage に保存
// ---------------------------------------------------------------------------

/** ログイン前に保存されていた予定 (最初にログインした人の個人カレンダーへ移す) */
const LEGACY_PERSONAL_KEY = "kizunatekku.events.v1";
let PERSONAL_KEY = LEGACY_PERSONAL_KEY;
let resetPersonal: () => void = () => {};

/** 個人カレンダーをログイン中のユーザーごとに分けて保存する */
export function setEventsUser(studentId: string) {
  const key = `kizunatekku.events.v2:${studentId}`;
  if (key === PERSONAL_KEY) return;
  try {
    const legacy = window.localStorage.getItem(LEGACY_PERSONAL_KEY);
    if (legacy !== null && window.localStorage.getItem(key) === null) {
      window.localStorage.setItem(key, legacy);
      window.localStorage.removeItem(LEGACY_PERSONAL_KEY);
    }
  } catch {
    // 移せなくても新しいキーで続ける
  }
  PERSONAL_KEY = key;
  resetPersonal();
}

function createPersonalStore(): Store {
  let state: EventsState | null = null;
  const listeners = createListeners();
  resetPersonal = () => {
    state = null;
    listeners.notify();
  };

  const read = (): EventsState => {
    if (state) return state;
    let events: CalendarEvent[] = [];
    try {
      const raw = window.localStorage.getItem(PERSONAL_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        events = parsed.map(parseEvent).filter((e) => e !== null);
      }
    } catch {
      // 読めない場合は空として扱う
    }
    state = { events, error: null };
    return state;
  };

  const write = (events: CalendarEvent[]) => {
    state = { events, error: null };
    try {
      window.localStorage.setItem(PERSONAL_KEY, JSON.stringify(events));
    } catch {
      // 保存できない環境 (プライベートモード等) ではメモリ上だけで保持する
    }
    listeners.notify();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      // 別タブでの変更も反映する
      const onStorage = (e: StorageEvent) => {
        if (e.key === PERSONAL_KEY) {
          state = null;
          listener();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot: read,
    async save(event) {
      write(upsert(read().events ?? [], event));
    },
    async remove(id) {
      write((read().events ?? []).filter((e) => e.id !== id));
    },
  };
}

// ---------------------------------------------------------------------------
// 共通カレンダー: サーバー (/api/shared-events) に保存
// ---------------------------------------------------------------------------

const SHARED_URL = "/api/shared-events";
const POLL_MS = 15_000;

function createSharedStore(): Store {
  let state: EventsState = { events: null, error: null };
  const listeners = createListeners();
  let stopPolling: (() => void) | null = null;

  const set = (next: EventsState) => {
    state = next;
    listeners.notify();
  };

  const applyResponse = async (res: Response) => {
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? `サーバーエラー (${res.status})`);
    }
    const data: unknown = await res.json();
    const events = Array.isArray(data)
      ? data.map(parseEvent).filter((e) => e !== null)
      : [];
    set({ events, error: null });
  };

  const refresh = async () => {
    try {
      await applyResponse(await fetch(SHARED_URL, { cache: "no-store" }));
    } catch {
      set({
        ...state,
        error: "共通カレンダーを読み込めませんでした。通信状況を確認してください。",
      });
    }
  };

  // 他の人の変更を取り込むため、表示中は定期的に再読み込みする
  const startPolling = () => {
    void refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  };

  /** 画面をすぐ更新し (楽観的更新)、失敗したらサーバーの状態に戻す */
  const mutate = async (
    optimistic: (events: CalendarEvent[]) => CalendarEvent[],
    request: () => Promise<Response>,
  ) => {
    set({ events: optimistic(state.events ?? []), error: null });
    try {
      await applyResponse(await request());
    } catch (err) {
      void refresh();
      throw err instanceof Error
        ? err
        : new Error("共通カレンダーに保存できませんでした");
    }
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) stopPolling = startPolling();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stopPolling?.();
          stopPolling = null;
        }
      };
    },
    getSnapshot: () => state,
    save: (event) =>
      mutate(
        (events) => upsert(events, event),
        () =>
          fetch(SHARED_URL, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event),
          }),
      ),
    remove: (id) =>
      mutate(
        (events) => events.filter((e) => e.id !== id),
        () =>
          fetch(`${SHARED_URL}?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          }),
      ),
  };
}

const stores: Record<CalendarKind, Store> = {
  shared: createSharedStore(),
  personal: createPersonalStore(),
};

const SERVER_STATE: EventsState = { events: null, error: null };

/** 指定したカレンダーの予定一覧。サーバー描画時は events が null */
export function useEvents(kind: CalendarKind): EventsState {
  const store = stores[kind];
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => SERVER_STATE,
  );
}

export function saveEvent(kind: CalendarKind, event: CalendarEvent) {
  return stores[kind].save(event);
}

export function deleteEvent(kind: CalendarKind, id: string) {
  return stores[kind].remove(id);
}

// ---------------------------------------------------------------------------
// 表示中のカレンダー (共通 / 個人) の選択。ブラウザごとに覚えておく
// ---------------------------------------------------------------------------

const KIND_KEY = "kizunatekku.calendar-kind";
const kindListeners = createListeners();
let kindMemory: CalendarKind | null = null;

function readKind(): CalendarKind {
  if (kindMemory) return kindMemory;
  try {
    const v = window.localStorage.getItem(KIND_KEY);
    if (v === "shared" || v === "personal") return v;
  } catch {
    // 読めない場合は既定値
  }
  return "shared";
}

function subscribeKind(listener: () => void) {
  kindListeners.add(listener);
  return () => {
    kindListeners.delete(listener);
  };
}

export function useCalendarKind(): CalendarKind {
  return useSyncExternalStore(subscribeKind, readKind, () => "shared");
}

export function setCalendarKind(kind: CalendarKind) {
  kindMemory = kind;
  try {
    window.localStorage.setItem(KIND_KEY, kind);
  } catch {
    // 保存できなくてもこのページ内では切り替わる
  }
  kindListeners.notify();
}

// ---------------------------------------------------------------------------

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
