import { CostCalculator } from "@/components/domain/cost-calculator";
import { catalog, findCatalog } from "@/lib/data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return catalog.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = findCatalog(slug);
  return { title: item ? `Владение ${item.brand} ${item.model}` : "Владение" };
}

export default async function CostPage({ params }: Props) {
  const { slug } = await params;
  const item = findCatalog(slug);
  if (!item) notFound();
  return <CostCalculator item={item} others={catalog} />;
}
