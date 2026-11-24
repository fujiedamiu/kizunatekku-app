export type User = {
  studentId: string;
  name: string;
};

/** 学籍番号の先頭は必ず M。画面では M の後ろの番号だけを入力してもらう */
export const STUDENT_ID_PREFIX = "M";

/** 学籍番号を大文字にそろえる (サーバー側で受け取った値に使う) */
export function normalizeStudentId(value: string): string {
  return value.trim().toUpperCase();
}

/** 入力欄の番号部分 (M の後ろ) を検証する。半角数字のみ */
export function validateStudentNumber(value: string): string | null {
  if (!value) return "学籍番号を入力してください";
  if (/[０-９]/.test(value))
    return "数字は半角で入力してください（全角は使えません）";
  if (!/^[0-9]+$/.test(value))
    return "M の後ろの番号を半角数字だけで入力してください";
  if (value.length > 19) return "番号が長すぎます";
  return null;
}

/** 学籍番号全体 (M + 半角数字) を検証する */
export function validateStudentId(value: string): string | null {
  if (!value.startsWith(STUDENT_ID_PREFIX))
    return "学籍番号は M から始まる必要があります";
  return validateStudentNumber(value.slice(STUDENT_ID_PREFIX.length));
}

export function validateName(value: string): string | null {
  if (!value) return "名前を入力してください";
  if (value.length > 50) return "名前は50文字以内で入力してください";
  return null;
}
