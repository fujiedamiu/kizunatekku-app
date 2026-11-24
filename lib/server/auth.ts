import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { User } from "../user";
import { readData, updateData } from "./db";

const COOKIE = "kz_session";
const SESSION_DAYS = 180;

type Users = Record<string, User & { createdAt: string }>;
type Sessions = Record<string, { studentId: string; expiresAt: string }>;

export async function findUser(studentId: string): Promise<User | null> {
  const users = await readData<Users>("users", {});
  const u = users[studentId];
  return u ? { studentId: u.studentId, name: u.name } : null;
}

/** 新規登録。すでに登録済みの学籍番号なら null */
export function createUser(user: User): Promise<User | null> {
  return updateData<Users, User | null>("users", {}, (users) => {
    if (users[user.studentId]) return { value: users, result: null };
    return {
      value: {
        ...users,
        [user.studentId]: { ...user, createdAt: new Date().toISOString() },
      },
      result: user,
    };
  });
}

/** ログイン状態にする (セッションを作って cookie に保存) */
export async function startSession(studentId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await updateData<Sessions, void>("sessions", {}, (sessions) => {
    // 期限切れのセッションはついでに掃除する
    const now = new Date().toISOString();
    const value: Sessions = {};
    for (const [t, s] of Object.entries(sessions)) {
      if (s.expiresAt > now) value[t] = s;
    }
    value[token] = { studentId, expiresAt: expires.toISOString() };
    return { value, result: undefined };
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await updateData<Sessions, void>("sessions", {}, (sessions) => {
      const value = { ...sessions };
      delete value[token];
      return { value, result: undefined };
    });
  }
  store.delete(COOKIE);
}

/** ログイン中のユーザー。未ログインなら null */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const sessions = await readData<Sessions>("sessions", {});
  const s = sessions[token];
  if (!s || s.expiresAt <= new Date().toISOString()) return null;
  return findUser(s.studentId);
}

export const unauthorized = () =>
  Response.json({ error: "ログインしてください" }, { status: 401 });
