import {
  databaseEnabled,
  readRecord,
  writeRecord,
  listGuideRecords,
} from "./database";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { guides } from "./guides";
import { Guide, validateGuide } from "./schema";
const dir = () =>
  process.env.DATA_DIR || path.join(process.cwd(), ".data", "guides");
export async function getGuide(id: string) {
  const seed = guides.find((g) => g.id === id);
  if (seed) return seed;
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) return null;
  try {
    const guide = validateGuide(
      databaseEnabled()
        ? await readRecord("guide", id)
        : JSON.parse(await fs.readFile(path.join(dir(), id + ".json"), "utf8")),
    );
    if (guide.generated && !guide.permissionsEvidenceChecked)
      return {
        ...guide,
        scopes: [],
        unknowns: [
          ...guide.unknowns,
          "This older investigation predates permission-evidence checks. Re-investigate before choosing permissions; its previous permission map is withheld.",
        ],
      };
    return guide;
  } catch {
    return null;
  }
}
export async function saveGuide(g: Guide) {
  validateGuide(g);
  if (databaseEnabled()) return writeRecord("guide", g.id, g);
  await fs.mkdir(dir(), { recursive: true });
  const file = path.join(dir(), g.id + ".json");
  const tmp = file + "." + randomUUID() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(g, null, 2), { mode: 0o600 });
  await fs.rename(tmp, file);
}
export async function listGuides() {
  try {
    const ids = databaseEnabled()
      ? await listGuideRecords()
      : (await fs.readdir(/*turbopackIgnore: true*/ dir()))
          .filter((f) => f.endsWith(".json"))
          .map((f) => f.replace(".json", ""));
    const extra = await Promise.all(ids.map(getGuide));
    const key = (g: Guide) =>
      g.domain
        .toLowerCase()
        .replace(/^(www|developers|developer|docs|api)\./, "");
    const latest = new Map<string, Guide>();
    for (const g of extra
      .filter((g): g is Guide => !!g)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
      latest.set(key(g), g);
    const referenceDomains = new Set(guides.map(key));
    return [
      ...guides,
      ...[...latest.values()].filter((g) => !referenceDomains.has(key(g))),
    ];
  } catch {
    return guides;
  }
}
