import { connection } from "next/server";
import { parseEvent } from "@/lib/calendar";
import {
  deleteSharedEvent,
  listSharedEvents,
  upsertSharedEvent,
} from "@/lib/shared-events-server";

const noStore = { "Cache-Control": "no-store" };

/** 共通カレンダーの予定一覧 */
export async function GET() {
  await connection();
  return Response.json(await listSharedEvents(), { headers: noStore });
}

/** 共通カレンダーに予定を追加・更新する */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON が不正です" }, { status: 400 });
  }
  const event = parseEvent(body);
  if (!event) {
    return Response.json({ error: "予定の内容が不正です" }, { status: 400 });
  }
  return Response.json(await upsertSharedEvent(event), { headers: noStore });
}

/** 共通カレンダーから予定を削除する (?id=...) */
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id がありません" }, { status: 400 });
  }
  return Response.json(await deleteSharedEvent(id), { headers: noStore });
}
