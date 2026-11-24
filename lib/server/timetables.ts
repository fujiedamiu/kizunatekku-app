import { randomUUID } from "node:crypto";
import type { User } from "../user";
import type { Timetable, TimetableInput, TimetableView } from "../timetable";
import { readData, updateData } from "./db";

type Subscriptions = Record<string, string[]>;

const toView = (
  tt: Timetable,
  user: User,
  subs: Subscriptions,
): TimetableView => ({
  ...tt,
  isOwner: tt.ownerId === user.studentId,
  subscribed: (subs[user.studentId] ?? []).includes(tt.id),
});

async function loadAll() {
  const [timetables, subs] = await Promise.all([
    readData<Timetable[]>("timetables", []),
    readData<Subscriptions>("subscriptions", {}),
  ]);
  return { timetables, subs };
}

/** 自分が作った時間割と、表示中にした他の人の時間割 */
export async function listMyTimetables(user: User): Promise<TimetableView[]> {
  const { timetables, subs } = await loadAll();
  const mine = new Set(subs[user.studentId] ?? []);
  return timetables
    .filter((t) => t.ownerId === user.studentId || mine.has(t.id))
    .map((t) => toView(t, user, subs));
}

const normalize = (s: string) => s.normalize("NFKC").toLowerCase();

/** 時間割の名前・作成者名・科目名で検索する */
export async function searchTimetables(
  user: User,
  query: string,
): Promise<TimetableView[]> {
  const q = normalize(query.trim());
  if (!q) return [];
  const { timetables, subs } = await loadAll();
  return timetables
    .filter((t) =>
      normalize(
        [t.title, t.ownerName, ...t.slots.map((s) => s.subject)].join("\n"),
      ).includes(q),
    )
    .slice(0, 50)
    .map((t) => toView(t, user, subs));
}

export function createTimetable(user: User, input: TimetableInput) {
  const tt: Timetable = {
    ...input,
    id: randomUUID(),
    ownerId: user.studentId,
    ownerName: user.name,
    updatedAt: new Date().toISOString(),
  };
  return updateData<Timetable[], Timetable>("timetables", [], (list) => ({
    value: [...list, tt],
    result: tt,
  }));
}

type EditResult = "ok" | "not-found" | "forbidden";

/** 作成者だけが更新できる */
export function updateTimetable(
  user: User,
  id: string,
  input: TimetableInput,
): Promise<EditResult> {
  return updateData<Timetable[], EditResult>("timetables", [], (list) => {
    const tt = list.find((t) => t.id === id);
    if (!tt) return { value: list, result: "not-found" };
    if (tt.ownerId !== user.studentId)
      return { value: list, result: "forbidden" };
    return {
      value: list.map((t) =>
        t.id === id
          ? {
              ...t,
              ...input,
              ownerName: user.name,
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
      result: "ok",
    };
  });
}

/** 作成者だけが削除できる */
export async function deleteTimetable(
  user: User,
  id: string,
): Promise<EditResult> {
  const result = await updateData<Timetable[], EditResult>(
    "timetables",
    [],
    (list) => {
      const tt = list.find((t) => t.id === id);
      if (!tt) return { value: list, result: "not-found" };
      if (tt.ownerId !== user.studentId)
        return { value: list, result: "forbidden" };
      return { value: list.filter((t) => t.id !== id), result: "ok" };
    },
  );
  if (result === "ok") {
    // 表示中にしていた人の一覧からも外す
    await updateData<Subscriptions, void>("subscriptions", {}, (subs) => {
      const value: Subscriptions = {};
      for (const [k, ids] of Object.entries(subs)) {
        value[k] = ids.filter((x) => x !== id);
      }
      return { value, result: undefined };
    });
  }
  return result;
}

/** 他の人の時間割を自分のカレンダーに表示する / やめる */
export async function setSubscribed(
  user: User,
  id: string,
  subscribed: boolean,
): Promise<boolean> {
  const timetables = await readData<Timetable[]>("timetables", []);
  if (!timetables.some((t) => t.id === id)) return false;
  await updateData<Subscriptions, void>("subscriptions", {}, (subs) => {
    const current = new Set(subs[user.studentId] ?? []);
    if (subscribed) current.add(id);
    else current.delete(id);
    return {
      value: { ...subs, [user.studentId]: [...current] },
      result: undefined,
    };
  });
  return true;
}
