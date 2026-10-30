import { getGuide } from "@/lib/store";
import { notFound } from "next/navigation";
import SetupView from "@/components/setup";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ guideId: string }>;
}) {
  const g = await getGuide((await params).guideId);
  if (!g) notFound();
  return <SetupView guide={g} />;
}
