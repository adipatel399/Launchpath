import { configured } from "@/lib/research";
export async function GET() {
  return Response.json(configured());
}
