import { connection } from "next/server";
import { parseEvent } from "@/lib/calendar";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import {
  deleteSharedEvent,
  listSharedEvents,
  upsertSharedEvent,
} from "@/lib/shared-events-server";

const noStore = { "Cache-Control": "no-store" };

/** 共通カレンダーの予定一覧 (ログインしていなくても見られる) */
export async function GET() {
  await connection();
  return Response.json(await listSharedEvents(), { headers: noStore });
}

/** 共通カレンダーに予定を追加・更新する */
export async function PUT(request: Request) {
  if (!(await currentUser())) return unauthorized();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid", 400);
  }
  const event = parseEvent(body);
  if (!event) {
    return apiError("invalid", 400);
  }
  return Response.json(await upsertSharedEvent(event), { headers: noStore });
}

/** 共通カレンダーから予定を削除する (?id=...) */
export async function DELETE(request: Request) {
  if (!(await currentUser())) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return apiError("invalid", 400);
  }
  return Response.json(await deleteSharedEvent(id), { headers: noStore });
}
