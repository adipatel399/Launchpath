import { getGuide } from "@/lib/store";
import { notFound } from "next/navigation";
import GuideView from "@/components/guide";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const g = await getGuide((await params).id);
  if (!g) notFound();
  return <GuideView guide={g} />;
}
