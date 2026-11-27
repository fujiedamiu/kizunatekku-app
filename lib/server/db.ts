import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

/**
 * データの保存先。
 *
 * - Upstash Redis の接続情報 (環境変数) があれば Redis に保存する。
 *   Vercel などファイルを書き込めない公開先ではこちらを使う。
 * - 接続情報がなければ data/ 以下の JSON ファイルに保存する (手元での開発用)。
 *
 * どちらも「名前 → JSON の値」を 1 つずつ持つだけのシンプルな仕組み。
 */

// Vercel の Upstash 連携は KV_REST_API_*、Upstash の画面からだと UPSTASH_REDIS_REST_* が設定される
const REDIS_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  REDIS_URL && REDIS_TOKEN
    ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
    : null;

/* ---------- Redis ---------- */

const KEY_PREFIX = "kz:data:";
const LOCK_PREFIX = "kz:lock:";
const LOCK_MS = 10_000;
const LOCK_WAIT_MS = 15_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 自分が取ったロックだけを外す */
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0`;

/**
 * 同じ名前のデータを同時に書き換えないためのロック。
 * サーバーが複数台で動いても、Redis 上で 1 件ずつ順番に処理される。
 */
async function withRedisLock<R>(
  db: Redis,
  name: string,
  task: () => Promise<R>,
): Promise<R> {
  const key = LOCK_PREFIX + name;
  const token = randomBytes(16).toString("hex");
  const deadline = Date.now() + LOCK_WAIT_MS;
  let wait = 50;
  while (!(await db.set(key, token, { nx: true, px: LOCK_MS }))) {
    if (Date.now() > deadline) throw new Error(`lock timeout: ${name}`);
    await sleep(wait);
    wait = Math.min(wait * 2, 500);
  }
  try {
    return await task();
  } finally {
    await db.eval(RELEASE_SCRIPT, [key], [token]).catch(() => {});
  }
}

async function redisLoad<T>(db: Redis, name: string, fallback: T): Promise<T> {
  const value = await db.get<T>(KEY_PREFIX + name);
  return value ?? fallback;
}

/* ---------- ファイル (手元での開発用) ---------- */

const DATA_DIR = path.join(process.cwd(), "data");

const fileOf = (name: string) => path.join(DATA_DIR, `${name}.json`);

async function fileLoad<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(fileOf(name), "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

async function fileSave(name: string, value: unknown) {
  await mkdir(DATA_DIR, { recursive: true });
  const file = fileOf(name);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await rename(tmp, file);
}

// 同時に届いた更新で書き込みが競合しないよう、変更は 1 件ずつ順番に処理する
let queue: Promise<unknown> = Promise.resolve();

function enqueue<R>(task: () => Promise<R>): Promise<R> {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

/* ---------- 公開する関数 ---------- */

/** 読み取り */
export function readData<T>(name: string, fallback: T): Promise<T> {
  if (redis) return redisLoad(redis, name, fallback);
  return enqueue(() => fileLoad(name, fallback));
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
  if (redis) {
    const db = redis;
    return withRedisLock(db, name, async () => {
      const { value, result } = fn(await redisLoad(db, name, fallback));
      await db.set(KEY_PREFIX + name, value);
      return result;
    });
  }
  return enqueue(async () => {
    const { value, result } = fn(await fileLoad(name, fallback));
    await fileSave(name, value);
    return result;
  });
}
