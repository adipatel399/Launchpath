import { listGuides } from "@/lib/store";
import Library from "@/components/library";
export const dynamic = "force-dynamic";
export default async function Page() {
  return <Library guides={await listGuides()} />;
}
