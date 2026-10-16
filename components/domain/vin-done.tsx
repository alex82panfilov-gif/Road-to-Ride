"use client";

import { useUser } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const options = [
  { id: "site", label: "Отправить VIN на этот сайт" },
  { id: "official", label: "Проверить самому на сайте Госавтоинспекции и в реестре залогов" },
  { id: "word", label: "Поверить продавцу на слово" },
];

export function VinDone() {
  const { data, update } = useUser();
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === "official";

  return (
    <div className="space-y-4">
      <Button variant="secondary" onClick={() => update((current) => ({ ...current, vinSectionRead: true }))}>
        {data.vinSectionRead ? "Раздел отмечен прочитанным" : "Отметить раздел прочитанным"}
      </Button>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Где проверять VIN?</legend>
        {options.map((option) => (
          <label key={option.id} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="vin-check"
              className="mt-1"
              checked={picked === option.id}
              onChange={() => {
                setPicked(option.id);
                if (option.id === "official") update((current) => ({ ...current, vinGuideDone: true }));
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      {picked && !correct ? <p className="text-sm">Этот сайт VIN не принимает. Номер вводят на официальных сервисах, а не отправляют продавцу «на слово».</p> : null}
      {data.vinGuideDone ? <p className="text-sm text-success">Верно. Значок «Детектив» на месте.</p> : null}
    </div>
  );
}
