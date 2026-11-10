import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin, ViteDevServer } from "vite";
import {
  emptySnapshot,
  isValidSnapshot,
  normalizeSnapshot,
  type LocalDataSnapshot,
} from "./src/lib/localDataTypes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");

const FILES = {
  documents: "documents.json",
  businesses: "businesses.json",
  buyers: "buyers.json",
  lineItems: "line-items.json",
  notes: "notes.json",
  settings: "settings.json",
  meta: "meta.json",
} as const;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile(fileName: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return { ok: true, value: undefined };
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (raw.trim() === "") return { ok: true, value: undefined };
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read ${fileName}: ${message}` };
  }
}

function atomicWriteJson(fileName: string, value: unknown) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

function loadSnapshot():
  | { ok: true; snapshot: LocalDataSnapshot }
  | { ok: false; error: string } {
  const documents = readJsonFile(FILES.documents);
  if (!documents.ok) return documents;
  const businesses = readJsonFile(FILES.businesses);
  if (!businesses.ok) return businesses;
  const buyers = readJsonFile(FILES.buyers);
  if (!buyers.ok) return buyers;
  const lineItems = readJsonFile(FILES.lineItems);
  if (!lineItems.ok) return lineItems;
  const notes = readJsonFile(FILES.notes);
  if (!notes.ok) return notes;
  const settings = readJsonFile(FILES.settings);
  if (!settings.ok) return settings;
  const meta = readJsonFile(FILES.meta);
  if (!meta.ok) return meta;

  const base = emptySnapshot();
  const metaValue =
    meta.value && typeof meta.value === "object"
      ? (meta.value as LocalDataSnapshot["meta"])
      : base.meta;

  const snapshot: LocalDataSnapshot = {
    documents: Array.isArray(documents.value) ? documents.value : [],
    businesses: Array.isArray(businesses.value) ? businesses.value : [],
    buyers: Array.isArray(buyers.value) ? buyers.value : [],
    lineItems: Array.isArray(lineItems.value) ? lineItems.value : [],
    notes: Array.isArray(notes.value) ? notes.value : [],
    settings:
      settings.value && typeof settings.value === "object"
        ? settings.value
        : null,
    activeBusinessId:
      typeof metaValue.activeBusinessId === "string"
        ? metaValue.activeBusinessId
        : null,
    meta: {
      activeBusinessId:
        typeof metaValue.activeBusinessId === "string"
          ? metaValue.activeBusinessId
          : null,
      localStorageImported: Boolean(metaValue.localStorageImported),
      updatedAt:
        typeof metaValue.updatedAt === "string"
          ? metaValue.updatedAt
          : base.meta.updatedAt,
    },
  };

  return { ok: true, snapshot };
}

function saveSnapshot(snapshot: LocalDataSnapshot) {
  const normalized = normalizeSnapshot(snapshot);
  atomicWriteJson(FILES.documents, normalized.documents);
  atomicWriteJson(FILES.businesses, normalized.businesses);
  atomicWriteJson(FILES.buyers, normalized.buyers);
  atomicWriteJson(FILES.lineItems, normalized.lineItems);
  atomicWriteJson(FILES.notes, normalized.notes);
  atomicWriteJson(FILES.settings, normalized.settings);
  atomicWriteJson(FILES.meta, normalized.meta);
  return normalized;
}

function readRequestBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(
  res: Connect.ServerResponse,
  status: number,
  body: unknown,
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function localDataMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = req.url?.split("?")[0];
    if (url !== "/api/local-data") {
      next();
      return;
    }

    if (req.method === "GET") {
      const loaded = loadSnapshot();
      if (!loaded.ok) {
        sendJson(res, 500, { error: loaded.error });
        return;
      }
      sendJson(res, 200, loaded.snapshot);
      return;
    }

    if (req.method === "PUT") {
      try {
        const raw = await readRequestBody(req);
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw) as unknown;
        } catch {
          sendJson(res, 400, { error: "Invalid JSON body" });
          return;
        }
        if (!isValidSnapshot(parsed)) {
          sendJson(res, 400, { error: "Invalid snapshot shape" });
          return;
        }
        const saved = saveSnapshot(parsed);
        sendJson(res, 200, saved);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendJson(res, 500, { error: `Failed to write local data: ${message}` });
      }
      return;
    }

    res.statusCode = 405;
    res.setHeader("Allow", "GET, PUT");
    res.end("Method Not Allowed");
  };
}

export function localDataPlugin(): Plugin {
  return {
    name: "easy-invoice-local-data",
    configureServer(server: ViteDevServer) {
      ensureDataDir();
      server.middlewares.use(localDataMiddleware());
    },
  };
}
