import { currentUser, unauthorized } from "@/lib/server/auth";
import { setSubscribed } from "@/lib/server/timetables";

async function handle(
  ctx: RouteContext<"/api/timetables/[id]/subscription">,
  subscribed: boolean,
) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!(await setSubscribed(user, id, subscribed)))
    return Response.json({ error: "時間割が見つかりません" }, { status: 404 });
  return Response.json({ ok: true });
}

/** 他の人の時間割を自分のカレンダーに表示する */
export async function PUT(
  _request: Request,
  ctx: RouteContext<"/api/timetables/[id]/subscription">,
) {
  return handle(ctx, true);
}

/** 表示をやめる */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/timetables/[id]/subscription">,
) {
  return handle(ctx, false);
}
