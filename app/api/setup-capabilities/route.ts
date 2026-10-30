import { NextRequest } from "next/server";
import { getGuide } from "@/lib/store";
import { managedAdapter } from "@/lib/setup/composio";
export async function GET(req: NextRequest) {
  const g = await getGuide(req.nextUrl.searchParams.get("guideId") || "");
  if (!g) return Response.json({ error: "Guide not found" }, { status: 404 });
  return Response.json(
    {
      composioConfigured: !!process.env.COMPOSIO_API_KEY,
      adapter: managedAdapter(
        g,
        req.nextUrl.searchParams.get("capability") === "send" ? "send" : "read",
      ),
      smokeTest: managedAdapter(g)?.slug === "github",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
