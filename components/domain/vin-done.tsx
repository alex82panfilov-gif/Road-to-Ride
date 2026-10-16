"use client";

import { useUser } from "@/components/providers";
import { Button } from "@/components/ui/button";

export function VinDone() {
  const { data, update } = useUser();
  if (data.vinGuideDone) return <p className="text-sm text-success">Раздел прочитан, значок «Детектив» на месте.</p>;
  return (
    <Button variant="secondary" onClick={() => update((current) => ({ ...current, vinGuideDone: true }))}>
      Я дочитал раздел и знаю, куда нажать
    </Button>
  );
}
