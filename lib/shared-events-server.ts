import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseEvent, type CalendarEvent } from "./calendar";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "shared-events.json");

async function load(): Promise<CalendarEvent[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(DATA_FILE, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseEvent).filter((e) => e !== null);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function save(events: CalendarEvent[]) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(events, null, 2), "utf8");
  await rename(tmp, DATA_FILE);
}

// 同時に届いた更新で書き込みが競合しないよう、変更は 1 件ずつ順番に処理する
let queue: Promise<unknown> = Promise.resolve();

function mutate(fn: (events: CalendarEvent[]) => CalendarEvent[]) {
  const next = queue.then(async () => {
    const events = fn(await load());
    await save(events);
    return events;
  });
  queue = next.catch(() => {});
  return next;
}

export function listSharedEvents() {
  return queue.then(load, load);
}

export function upsertSharedEvent(event: CalendarEvent) {
  return mutate((events) =>
    events.some((e) => e.id === event.id)
      ? events.map((e) => (e.id === event.id ? event : e))
      : [...events, event],
  );
}

export function deleteSharedEvent(id: string) {
  return mutate((events) => events.filter((e) => e.id !== id));
}
