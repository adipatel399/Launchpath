import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  loadSetup,
  OWNER_COOKIE,
  publicSetup,
  recordEvent,
  saveSetup,
} from "@/lib/setup/session";
import { guard } from "@/lib/guard";
import { readJSON } from "@/lib/http";
import { getGuide } from "@/lib/store";
import {
  authorizeSetup,
  verifySetup,
  smokeTestSetup,
} from "@/lib/setup/composio";
export const runtime = "nodejs";
const inFlight = new Set<string>();
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await loadSetup(
    (await params).id,
    req.cookies.get(OWNER_COOKIE)?.value || "",
  );
  return r
    ? NextResponse.json(publicSetup(r), {
        headers: { "Cache-Control": "no-store" },
      })
    : NextResponse.json(
        { error: "Setup workspace not found for this browser." },
        { status: 404 },
      );
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let id = "";
  try {
    guard(req, "setup-action");
    id = (await params).id;
    const r = await loadSetup(id, req.cookies.get(OWNER_COOKIE)?.value || "");
    if (!r)
      return NextResponse.json(
        { error: "Setup workspace not found for this browser." },
        { status: 404 },
      );
    if (r.status === "EXPIRED")
      throw Error("This setup workspace expired. Prepare a new one.");
    const { action } = z
      .object({ action: z.enum(["authorize", "verify", "test"]) })
      .parse(await readJSON(req));
    if (inFlight.has(id))
      return NextResponse.json(
        { error: "A setup action is already running. Wait for it to finish." },
        { status: 409 },
      );
    inFlight.add(id);
    try {
      if (action === "authorize") {
        const g = await getGuide(r.guideId);
        if (!g) throw Error("Guide not found.");
        const publicOrigin =
          process.env.APP_URL ||
          req.headers.get("origin") ||
          `${req.nextUrl.protocol}//${req.headers.get("host")}`;
        const url = new URL("/setup/" + g.id, publicOrigin);
        url.searchParams.set("attempt", r.id);
        await authorizeSetup(r, g, url.href);
      } else if (action === "verify") await verifySetup(r);
      else await smokeTestSetup(r);
      await saveSetup(r);
      return NextResponse.json(publicSetup(r), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (e) {
      recordEvent(
        r,
        "Action needs attention",
        e instanceof Error ? e.message : "Setup action failed.",
        "error",
      );
      await saveSetup(r);
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : "Action failed.",
          setup: publicSetup(r),
        },
        { status: 400 },
      );
    } finally {
      inFlight.delete(id);
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid setup action." },
      { status: 400 },
    );
  }
}
