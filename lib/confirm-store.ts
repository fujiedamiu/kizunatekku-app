import { useSyncExternalStore } from "react";

/**
 * 確認・お知らせのダイアログをアプリの画面内に出すための仕組み。
 *
 * window.confirm / window.alert は、Slack・LINE などのアプリ内ブラウザや
 * ホーム画面に追加したアプリでは表示されずに「キャンセル」扱いになることがあるため使わない。
 * 画面側は <ConfirmHost /> を 1 つ置いておく。
 */
export type ConfirmRequest = {
  message: string;
  /** 決定ボタンの文言 (省略時は OK) */
  confirmLabel?: string;
  /** 削除など取り消せない操作のときは赤いボタンにする */
  danger?: boolean;
  /** true ならキャンセルボタンを出さない (お知らせ) */
  alertOnly?: boolean;
};

type Pending = ConfirmRequest & { resolve: (ok: boolean) => void };

let current: Pending | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** 確認ダイアログを出し、決定なら true・キャンセルなら false を返す */
export function askConfirm(
  message: string,
  options: Omit<ConfirmRequest, "message" | "alertOnly"> = {},
): Promise<boolean> {
  // 前の確認が残っていたらキャンセル扱いにする
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...options, message, resolve };
    notify();
  });
}

/** お知らせ (OK ボタンだけ) を出す */
export async function showAlert(message: string): Promise<void> {
  current?.resolve(false);
  await new Promise<boolean>((resolve) => {
    current = { message, alertOnly: true, resolve };
    notify();
  });
}

/** ダイアログのボタンが押されたとき */
export function answerConfirm(ok: boolean) {
  const pending = current;
  current = null;
  notify();
  pending?.resolve(ok);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useConfirmRequest(): ConfirmRequest | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
