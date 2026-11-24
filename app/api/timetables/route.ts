import { connection } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import {
  createTimetable,
  searchTimetables,
} from "@/lib/server/timetables";
import { parseTimetableInput } from "@/lib/timetable";

/** 時間割を検索する (?q=キーワード) */
export async function GET(request: Request) {
  await connection();
  const user = await currentUser();
  if (!user) return unauthorized();
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(await searchTimetables(user, q), {
    headers: { "Cache-Control": "no-store" },
  });
}

/** 時間割を作成する (作成者 = ログイン中のユーザー) */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = parseTimetableInput(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  return Response.json(await createTimetable(user, parsed.value));
}
