import { getGuide } from "@/lib/store";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await getGuide((await params).id);
  return g
    ? Response.json(g)
    : Response.json({ error: "Guide not found" }, { status: 404 });
}
