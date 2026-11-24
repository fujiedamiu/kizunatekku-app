import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * data/ 以下の JSON ファイルを簡易データベースとして使う。
 * 同時に届いた更新で書き込みが競合しないよう、変更は 1 件ずつ順番に処理する。
 */
const DATA_DIR = path.join(process.cwd(), "data");

const fileOf = (name: string) => path.join(DATA_DIR, `${name}.json`);

async function load<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(fileOf(name), "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

async function save(name: string, value: unknown) {
  await mkdir(DATA_DIR, { recursive: true });
  const file = fileOf(name);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await rename(tmp, file);
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<R>(task: () => Promise<R>): Promise<R> {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

/** 読み取り (進行中の書き込みが終わってから読む) */
export function readData<T>(name: string, fallback: T): Promise<T> {
  return enqueue(() => load(name, fallback));
}

/**
 * 読み取り → 変更 → 保存 をまとめて行う。
 * fn は新しい値と呼び出し元に返す結果を返す。
 */
export function updateData<T, R>(
  name: string,
  fallback: T,
  fn: (value: T) => { value: T; result: R },
): Promise<R> {
  return enqueue(async () => {
    const { value, result } = fn(await load(name, fallback));
    await save(name, value);
    return result;
  });
}
