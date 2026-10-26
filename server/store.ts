import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { seedData } from "../src/data.js";
import type { AppData } from "../src/types.js";

const dataFile = resolve(process.cwd(), "server", "data", "database.json");
let writeQueue = Promise.resolve();

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppData>;
  return candidate.version === 1
    && Array.isArray(candidate.clients)
    && Array.isArray(candidate.equipment)
    && Array.isArray(candidate.workOrders);
}

async function ensureStore() {
  await mkdir(dirname(dataFile), { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await saveData(seedData);
  }
}

export async function getData(): Promise<AppData> {
  await ensureStore();
  const parsed = JSON.parse(await readFile(dataFile, "utf8")) as unknown;
  if (!isAppData(parsed)) throw new Error("数据库文件格式无效");
  return parsed;
}

export async function saveData(data: AppData): Promise<void> {
  if (!isAppData(data)) throw new Error("提交的数据格式无效");
  const snapshot = JSON.stringify(data, null, 2);
  writeQueue = writeQueue.then(async () => {
    await mkdir(dirname(dataFile), { recursive: true });
    const temporary = `${dataFile}.tmp`;
    await writeFile(temporary, snapshot, "utf8");
    await rename(temporary, dataFile);
  });
  return writeQueue;
}

export async function resetData(): Promise<AppData> {
  const fresh = structuredClone(seedData);
  await saveData(fresh);
  return fresh;
}
