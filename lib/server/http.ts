import { errorMessage, type ErrorCode, type ErrorParams } from "../errors";
import { tJa } from "../i18n/core";

/**
 * API のエラーレスポンス。
 * code を見て画面側が選択中の言語で表示する (error は日本語の説明)。
 */
export function apiError(
  code: ErrorCode,
  status: number,
  params?: ErrorParams,
): Response {
  return Response.json(
    { error: errorMessage(tJa, code, params), code, params },
    { status },
  );
}
