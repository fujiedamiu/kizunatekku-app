import { connection } from "next/server";
import {
  createUser,
  currentUser,
  endSession,
  findUser,
  startSession,
} from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import {
  normalizeStudentId,
  validateName,
  validateStudentId,
} from "@/lib/user";

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
  if (!body) return apiError("invalid", 400);

  const studentId = normalizeStudentId(String(body.studentId ?? ""));
  const idError = validateStudentId(studentId);
  if (idError) return apiError(idError.code, 400, idError.params);

  if (body.mode === "register") {
    const name = String(body.name ?? "").trim();
    const nameError = validateName(name);
    if (nameError) return apiError(nameError.code, 400, nameError.params);
    const user = await createUser({ studentId, name });
    if (!user) return apiError("studentIdTaken", 409);
    await startSession(studentId);
    return Response.json({ user });
  }

  if (body.mode === "login") {
    const user = await findUser(studentId);
    if (!user) return apiError("studentIdNotFound", 404);
    await startSession(studentId);
    return Response.json({ user });
  }

  return apiError("invalid", 400);
}

/** ログアウト */
export async function DELETE() {
  await endSession();
  return Response.json({ user: null });
}
