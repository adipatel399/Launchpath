import { getGuide } from "@/lib/store";
import { cachedLogo } from "@/lib/logos";
export const runtime = "nodejs";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guide = await getGuide((await params).id);
  if (!guide) return new Response(null, { status: 404 });
  const logo = await cachedLogo(guide.name, guide.domain);
  return new Response(Buffer.from(logo.body), {
    headers: {
      "Content-Type": logo.type,
      "Cache-Control": "public, max-age=3600",
      "X-Logo-Source": logo.source,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
