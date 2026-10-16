import { SavingsPanel } from "@/components/domain/savings-panel";
import { catalog } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Копилка" };

export default function SavingsPage() {
  return <SavingsPanel items={catalog} />;
}
