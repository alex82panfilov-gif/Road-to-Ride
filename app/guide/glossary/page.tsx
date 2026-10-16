import { glossary } from "@/lib/content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Словарь" };

export default function GlossaryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-[2rem] leading-tight font-semibold">Словарь</h1>
      <dl className="space-y-4">
        {glossary.map((term) => (
          <div key={term.id} id={term.id}>
            <dt className="font-semibold">{term.title}</dt>
            <dd className="text-muted">{term.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
