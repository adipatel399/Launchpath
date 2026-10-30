import postgres from "postgres";
import { readFile } from "node:fs/promises";
if (process.env.DATABASE_URL) {
  const hostname = new URL(process.env.DATABASE_URL).hostname;
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    connect_timeout: 15,
    ...(hostname.endsWith(".render.com") ? { ssl: "verify-full" } : {}),
    onnotice: () => {},
  });
  try {
    const migration = await readFile(
      new URL("../migrations/001_records.sql", import.meta.url),
      "utf8",
    );
    for (const statement of migration
      .split(";")
      .filter((part) => part.trim())) {
      await sql.unsafe(statement);
    }
    console.log("Database schema is ready.");
  } finally {
    await sql.end();
  }
}
