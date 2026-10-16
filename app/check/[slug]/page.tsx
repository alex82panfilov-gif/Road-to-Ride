import { ChecklistView } from "@/components/domain/checklist-view";
import { findCatalog, getModel, models } from "@/lib/data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return models.map((model) => ({ slug: model.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = findCatalog(slug);
  return { title: item ? `Осмотр ${item.brand} ${item.model}` : "Осмотр" };
}

export default async function CheckPage({ params }: Props) {
  const { slug } = await params;
  const model = getModel(slug);
  if (!model) notFound();
  return <ChecklistView item={{ slug: model.slug, brand: model.brand, model: model.model }} points={model.checklist} />;
}
