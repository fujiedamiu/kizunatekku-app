import { currentUser, unauthorized } from "@/lib/server/auth";
import { deleteTimetable, updateTimetable } from "@/lib/server/timetables";
import { parseTimetableInput } from "@/lib/timetable";

const results = {
  ok: () => Response.json({ ok: true }),
  "not-found": () =>
    Response.json({ error: "時間割が見つかりません" }, { status: 404 }),
  forbidden: () =>
    Response.json(
      { error: "この時間割を編集できるのは作成者だけです" },
      { status: 403 },
    ),
};

/** 時間割を更新する (作成者のみ) */
export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/timetables/[id]">,
) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const parsed = parseTimetableInput(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  return results[await updateTimetable(user, id, parsed.value)]();
}

/** 時間割を削除する (作成者のみ) */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/timetables/[id]">,
) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  return results[await deleteTimetable(user, id)]();
}
