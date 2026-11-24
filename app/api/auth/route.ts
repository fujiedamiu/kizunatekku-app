import { connection } from "next/server";
import {
  createUser,
  currentUser,
  endSession,
  findUser,
  startSession,
} from "@/lib/server/auth";
import {
  normalizeStudentId,
  validateName,
  validateStudentId,
} from "@/lib/user";

const bad = (error: string, status = 400) =>
  Response.json({ error }, { status });

/** ログイン中のユーザー */
export async function GET() {
  await connection();
  return Response.json(
    { user: await currentUser() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * mode: "register" … 初回登録 (名前 + 学籍番号)
 * mode: "login"    … 2 回目以降 (学籍番号のみ)
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    mode?: unknown;
    studentId?: unknown;
    name?: unknown;
  } | null;
  if (!body) return bad("内容が不正です");

  const studentId = normalizeStudentId(String(body.studentId ?? ""));
  const idError = validateStudentId(studentId);
  if (idError) return bad(idError);

  if (body.mode === "register") {
    const name = String(body.name ?? "").trim();
    const nameError = validateName(name);
    if (nameError) return bad(nameError);
    const user = await createUser({ studentId, name });
    if (!user)
      return bad(
        "この学籍番号はすでに登録されています。「ログイン」から入ってください。",
        409,
      );
    await startSession(studentId);
    return Response.json({ user });
  }

  if (body.mode === "login") {
    const user = await findUser(studentId);
    if (!user)
      return bad(
        "この学籍番号は登録されていません。初めての方は「新規登録」から登録してください。",
        404,
      );
    await startSession(studentId);
    return Response.json({ user });
  }

  return bad("内容が不正です");
}

/** ログアウト */
export async function DELETE() {
  await endSession();
  return Response.json({ user: null });
}
