import { scoreText } from "@/lib/cn";
import { scoreLabel } from "@/lib/market";
import { scoreBand } from "@/lib/score";

const color = {
  low: "text-score-low",
  mid: "text-score-mid",
  good: "text-score-good",
  top: "text-score-top",
};

export function ScorePill({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <span className={`inline-flex items-baseline gap-2 ${color[band]}`}>
      <span className="num text-lg font-semibold">{scoreText(score)}</span>
      <span className="text-sm">{scoreLabel(score)}</span>
    </span>
  );
}
