import postgres from "postgres";
let client: ReturnType<typeof postgres> | undefined;
export const databaseEnabled = () => !!process.env.DATABASE_URL;
function database() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw Error("DATABASE_URL is not configured.");
    const hostname = new URL(url).hostname;
    client = postgres(url, {
      max: 3,
      connect_timeout: 10,
      idle_timeout: 20,
      ...(hostname.endsWith(".render.com")
        ? { ssl: "verify-full" as const }
        : {}),
    });
  }
  return client;
}
export async function readRecord(namespace: "guide" | "setup", id: string) {
  const sql = database();
  const rows =
    await sql`select document from launchpath_records where namespace = ${namespace} and id = ${id}`;
  return rows[0]?.document ?? null;
}
export async function writeRecord(
  namespace: "guide" | "setup",
  id: string,
  value: unknown,
  expiresAt: string | null = null,
) {
  const sql = database();
  const document = sql.json(JSON.parse(JSON.stringify(value)));
  await sql`insert into launchpath_records (namespace, id, document, expires_at) values (${namespace}, ${id}, ${document}, ${expiresAt}::timestamptz) on conflict (namespace, id) do update set document = excluded.document, expires_at = excluded.expires_at`;
}
export async function listGuideRecords() {
  const sql = database();
  const rows =
    await sql`select id from launchpath_records where namespace = 'guide' order by created_at desc limit 500`;
  return rows.map((row) => String(row.id));
}
