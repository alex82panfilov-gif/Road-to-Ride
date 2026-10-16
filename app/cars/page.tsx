import { CatalogBrowser } from "@/components/domain/catalog-browser";
import { Skeleton } from "@/components/ui/skeleton";
import { catalog } from "@/lib/data";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Машины" };

export default function CarsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-[2rem] leading-tight font-semibold">Машины</h1>
      <Suspense fallback={<Skeleton className="h-80" />}>
        <CatalogBrowser items={catalog} />
      </Suspense>
    </div>
  );
}
