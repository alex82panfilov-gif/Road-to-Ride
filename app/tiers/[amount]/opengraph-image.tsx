import { ImageResponse } from "next/og";
import { bestAt } from "@/lib/market";
import { catalog } from "@/lib/data";
import { isTierAmount } from "@/lib/tiers";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TierImage({ params }: { params: Promise<{ amount: string }> }) {
  const { amount } = await params;
  const budget = Number(amount);
  const best = isTierAmount(budget) ? bestAt(catalog, budget) : null;
  const title = isTierAmount(budget) ? `${budget.toLocaleString("ru-RU")} ₽` : "Уровень";
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        color: "#1d1d1f",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 28, color: "#6e6e73" }}>Road to Ride</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 72 }}>{title}</div>
        <div style={{ fontSize: 36 }}>{best ? `${best.brand} ${best.model}` : "В каталоге пока пусто"}</div>
      </div>
    </div>,
    size,
  );
}
