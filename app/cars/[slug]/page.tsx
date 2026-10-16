import { ModelArticle } from "@/components/domain/model-article";
import { getModel, latestPrice, models, priceHistory } from "@/lib/data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return models.map((model) => ({ slug: model.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const model = getModel(slug);
  if (!model) return { title: "Модель" };
  return { title: `${model.brand} ${model.model}`, description: model.summary };
}

export default async function ModelPage({ params }: Props) {
  const { slug } = await params;
  const model = getModel(slug);
  const price = model ? latestPrice(model.slug) : undefined;
  if (!model) notFound();
  if (!price) {
    return (
      <article className="space-y-4">
        <h1 className="text-[2rem] leading-tight font-semibold">
          {model.brand} {model.model}
        </h1>
        <p>Цены пока нет. Карточка описывает моторы и риски, а снимок объявлений ещё не прошёл проверку.</p>
        <p>{model.summary}</p>
        <a href={`/check/${model.slug}`}>Чек-лист осмотра</a>
      </article>
    );
  }
  return <ModelArticle model={model} price={price} history={priceHistory(model.slug)} />;
}
