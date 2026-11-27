import type { ValidationError } from "./errors";

export type User = {
  studentId: string;
  name: string;
};

/**
 * ログイン機能を使うかどうか。
 * false の間はログイン・新規登録の画面を出さず、全員を下の GUEST_USER として扱う。
 * ログインを戻すときは true にする。
 */
export const LOGIN_ENABLED = false;

/** ログイン機能を止めている間に使う、全員共通のユーザー */
export const GUEST_USER: User = { studentId: "GUEST", name: "ゲスト" };

/** 学籍番号の先頭は必ず M。画面では M の後ろの番号だけを入力してもらう */
export const STUDENT_ID_PREFIX = "M";

/** 学籍番号を大文字にそろえる (サーバー側で受け取った値に使う) */
export function normalizeStudentId(value: string): string {
  return value.trim().toUpperCase();
}

/** 入力欄の番号部分 (M の後ろ) を検証する。半角数字のみ */
export function validateStudentNumber(value: string): ValidationError {
  if (!value) return { code: "studentIdRequired" };
  if (/[０-９]/.test(value)) return { code: "studentIdFullWidth" };
  if (!/^[0-9]+$/.test(value))
    return { code: "studentIdDigits", params: { prefix: STUDENT_ID_PREFIX } };
  if (value.length > 19) return { code: "studentIdTooLong" };
  return null;
}

/** 学籍番号全体 (M + 半角数字) を検証する */
export function validateStudentId(value: string): ValidationError {
  if (!value.startsWith(STUDENT_ID_PREFIX))
    return { code: "studentIdPrefix", params: { prefix: STUDENT_ID_PREFIX } };
  return validateStudentNumber(value.slice(STUDENT_ID_PREFIX.length));
}

export function validateName(value: string): ValidationError {
  if (!value) return { code: "nameRequired" };
  if (value.length > 50) return { code: "nameTooLong" };
  return null;
}
