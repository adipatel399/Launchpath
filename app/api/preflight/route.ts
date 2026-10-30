import { readJSON } from "@/lib/http";
import { NextRequest } from "next/server";
import { guard } from "@/lib/guard";
import { inspectWebsite, preflightInput } from "@/lib/preflight";
import { getGuide } from "@/lib/store";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    guard(req, "preflight");
    const input = preflightInput.parse(await readJSON(req));
    const g = await getGuide(input.guideId);
    if (!g) return Response.json({ error: "Guide not found" }, { status: 404 });
    return Response.json(await inspectWebsite(g, input));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Inspection failed" },
      { status: 400 },
    );
  }
}
