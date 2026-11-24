import { parseEvent, type CalendarEvent } from "./calendar";
import { readData, updateData } from "./server/db";

const NAME = "shared-events";

const clean = (raw: unknown): CalendarEvent[] =>
  Array.isArray(raw) ? raw.map(parseEvent).filter((e) => e !== null) : [];

export async function listSharedEvents() {
  return clean(await readData<unknown>(NAME, []));
}

export function upsertSharedEvent(event: CalendarEvent) {
  return updateData<unknown, CalendarEvent[]>(NAME, [], (raw) => {
    const events = clean(raw);
    const value = events.some((e) => e.id === event.id)
      ? events.map((e) => (e.id === event.id ? event : e))
      : [...events, event];
    return { value, result: value };
  });
}

export function deleteSharedEvent(id: string) {
  return updateData<unknown, CalendarEvent[]>(NAME, [], (raw) => {
    const value = clean(raw).filter((e) => e.id !== id);
    return { value, result: value };
  });
}
