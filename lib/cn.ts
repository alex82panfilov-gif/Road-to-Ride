export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function scoreText(score: number): string {
  return score.toFixed(1).replace(".", ",");
}
