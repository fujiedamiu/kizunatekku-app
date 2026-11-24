import type { MessageKey, Translate } from "./i18n/core";

/** 画面に出すエラーの種類 (メッセージの "err.〇〇" に対応) */
export type ErrorCode = {
  [K in MessageKey]: K extends `err.${infer C}` ? C : never;
}[MessageKey];

export type ErrorParams = Record<string, string | number>;

/** 種類 (code) 付きのエラー。表示するときに選択中の言語へ翻訳する */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public params?: ErrorParams,
  ) {
    super(code);
  }
}

/** 入力チェックの結果 (問題なければ null) */
export type ValidationError = { code: ErrorCode; params?: ErrorParams } | null;

export function errorMessage(
  t: Translate,
  code: ErrorCode,
  params?: ErrorParams,
): string {
  return t(`err.${code}` as MessageKey, params);
}

/** 何かしらのエラーを、選択中の言語のメッセージにする */
export function describeError(
  t: Translate,
  err: unknown,
  fallback: ErrorCode = "generic",
): string {
  if (err instanceof AppError) return errorMessage(t, err.code, err.params);
  return errorMessage(t, fallback);
}

/** API のエラーレスポンス ({ code, params }) を AppError にする */
export async function errorFromResponse(res: Response): Promise<AppError> {
  const body = (await res.json().catch(() => null)) as {
    code?: string;
    params?: ErrorParams;
  } | null;
  const code = body?.code as ErrorCode | undefined;
  if (code) return new AppError(code, body?.params);
  if (res.status === 401) return new AppError("unauthorized");
  return new AppError("server");
}
