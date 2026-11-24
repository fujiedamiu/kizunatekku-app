import { connection } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { listMyTimetables } from "@/lib/server/timetables";

/** 自分が作った時間割と、表示中の他の人の時間割 */
export async function GET() {
  await connection();
  const user = await currentUser();
  if (!user) return unauthorized();
  return Response.json(await listMyTimetables(user), {
    headers: { "Cache-Control": "no-store" },
  });
}
