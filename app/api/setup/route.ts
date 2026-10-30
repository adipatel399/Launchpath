import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/guard";
import { readJSON } from "@/lib/http";
import { getGuide } from "@/lib/store";
import { buildSetupArtifacts } from "@/lib/setup/artifacts";
import {
  createSetupRecord,
  newOwner,
  OWNER_COOKIE,
  publicSetup,
  saveSetup,
} from "@/lib/setup/session";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    guard(req, "setup-create");
    const input = z
      .object({
        guideId: z.string().max(80),
        mode: z.enum(["custom", "managed"]),
        appName: z.string().trim().min(1).max(35),
        callback: z.string().max(1000).default(""),
        audience: z.enum(["internal", "pilot", "public"]).default("public"),
        capability: z.enum(["read", "send"]).default("read"),
      })
      .parse(await readJSON(req));
    const g = await getGuide(input.guideId);
    if (!g)
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    const owner = req.cookies.get(OWNER_COOKIE)?.value || newOwner();
    const artifacts = buildSetupArtifacts(
      g,
      {
        audience: input.audience,
        capability: input.capability,
        route: input.mode,
      },
      input.appName,
      input.callback,
    );
    const record = createSetupRecord(
      g.id,
      owner,
      input.mode,
      input.appName,
      artifacts,
      input.capability,
    );
    await saveSetup(record);
    const res = NextResponse.json(publicSetup(record), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
    res.cookies.set(OWNER_COOKIE, owner, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 86400,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not prepare setup." },
      { status: 400 },
    );
  }
}
