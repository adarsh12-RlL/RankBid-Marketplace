import { notFound } from "next/navigation";
import RankLensDocs from "@/components/RankLensDocs";
import { getRankLensGuide, RANKLENS_GUIDES } from "@/lib/ranklens-guides";
export const dynamic = "force-static";
export function generateStaticParams() { return RANKLENS_GUIDES.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getRankLensGuide((await params).slug);
  return { title: guide?.title || "Documentation", description: guide?.summary || "RankLens documentation." };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getRankLensGuide((await params).slug);
  if (!guide) notFound();
  return <RankLensDocs guide={guide} />;
}
