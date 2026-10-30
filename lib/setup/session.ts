import { databaseEnabled, readRecord, writeRecord } from "../database";
import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { SetupArtifact } from "./artifacts";
export const setupRecordSchema = z.object({
  id: z.string().uuid(),
  guideId: z.string(),
  ownerHash: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  mode: z.enum(["custom", "managed"]),
  capability: z.enum(["read", "send"]),
  appName: z.string(),
  userId: z.string(),
  artifacts: z.array(
    z.object({
      name: z.string(),
      mime: z.string(),
      content: z.string(),
      validation: z.string(),
      sourceUrls: z.array(z.string()),
    }),
  ),
  events: z.array(
    z.object({
      at: z.string(),
      title: z.string(),
      detail: z.string(),
      kind: z.enum(["observed", "prepared", "handoff", "error"]),
    }),
  ),
  status: z.enum([
    "PREPARED",
    "AWAITING_CONSENT",
    "ACTIVE",
    "FAILED",
    "EXPIRED",
  ]),
  toolkit: z.string().optional(),
  authConfigId: z.string().optional(),
  connectedAccountId: z.string().optional(),
  redirectUrl: z.string().optional(),
  linkExpiresAt: z.string().optional(),
  smoke: z
    .object({
      status: z.number(),
      checkedAt: z.string(),
      description: z.string(),
    })
    .optional(),
});
export type SetupRecord = z.infer<typeof setupRecordSchema>;
export const OWNER_COOKIE = "lp_setup_owner";
export const newOwner = () => randomBytes(32).toString("hex");
export const hashOwner = (owner: string) =>
  createHash("sha256").update(owner).digest("hex");
export function owns(record: SetupRecord, owner: string) {
  const a = Buffer.from(record.ownerHash, "hex"),
    b = Buffer.from(hashOwner(owner), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
const dir = () =>
  path.join(
    process.env.DATA_DIR || path.join(process.cwd(), ".data"),
    "setup-sessions",
  );
export function createSetupRecord(
  guideId: string,
  owner: string,
  mode: "custom" | "managed",
  appName: string,
  artifacts: SetupArtifact[],
  capability: "read" | "send" = "read",
): SetupRecord {
  const now = new Date();
  return {
    id: randomUUID(),
    guideId,
    ownerHash: hashOwner(owner),
    userId: "launchpath_" + hashOwner(owner).slice(0, 24),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 86400000).toISOString(),
    mode,
    capability,
    appName,
    artifacts,
    status: "PREPARED",
    events: [
      {
        at: now.toISOString(),
        title: "Setup workspace prepared",
        detail:
          "The guide and configuration artifacts are ready. No provider app has been registered and no user account has authorized access.",
        kind: "prepared",
      },
    ],
  };
}
export async function saveSetup(record: SetupRecord) {
  setupRecordSchema.parse(record);
  if (databaseEnabled())
    return writeRecord("setup", record.id, record, record.expiresAt);
  await fs.mkdir(dir(), { recursive: true, mode: 0o700 });
  const file = path.join(dir(), record.id + ".json");
  const tmp = file + "." + randomUUID() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(record), { mode: 0o600 });
  await fs.rename(tmp, file);
}
export async function loadSetup(id: string, owner: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  try {
    const record = setupRecordSchema.parse(
      databaseEnabled()
        ? await readRecord("setup", id)
        : JSON.parse(await fs.readFile(path.join(dir(), id + ".json"), "utf8")),
    );
    if (!owns(record, owner)) return null;
    if (Date.parse(record.expiresAt) < Date.now())
      return { ...record, status: "EXPIRED" as const };
    return record;
  } catch {
    return null;
  }
}
export function publicSetup(record: SetupRecord) {
  return {
    id: record.id,
    guideId: record.guideId,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    mode: record.mode,
    capability: record.capability,
    appName: record.appName,
    artifacts: record.artifacts,
    events: record.events,
    status: record.status,
    redirectUrl:
      record.status === "AWAITING_CONSENT" ? record.redirectUrl : undefined,
    linkExpiresAt: record.linkExpiresAt,
    smoke: record.smoke,
  };
}
export function recordEvent(
  record: SetupRecord,
  title: string,
  detail: string,
  kind: SetupRecord["events"][number]["kind"],
) {
  record.events.push({ at: new Date().toISOString(), title, detail, kind });
}
