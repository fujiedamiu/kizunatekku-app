"use client";

import { useEffect } from "react";
import { answerConfirm, useConfirmRequest } from "@/lib/confirm-store";
import { useI18n } from "@/lib/i18n";

/** askConfirm / showAlert で頼まれた確認・お知らせを、画面の一番手前に表示する */
export default function ConfirmHost() {
  const req = useConfirmRequest();
  const { t } = useI18n();

  useEffect(() => {
    if (!req) return;
    // 後ろのダイアログが Escape で閉じないよう、先に受け取って止める
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      answerConfirm(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [req]);

  if (!req) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={() => answerConfirm(false)}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900"
      >
        <p id="confirm-message" className="text-sm whitespace-pre-wrap">
          {req.message}
        </p>
        <div className="flex justify-end gap-2">
          {!req.alertOnly && (
            <button
              onClick={() => answerConfirm(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {t("common.cancel")}
            </button>
          )}
          <button
            autoFocus
            onClick={() => answerConfirm(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              req.danger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {req.confirmLabel ?? t("common.ok")}
          </button>
        </div>
      </section>
    </div>
  );
}
