import { meta } from "./meta";

export type BadgeId = "first" | "halfway" | "patience" | "ready" | "detective" | "family";

export const BADGE_ORDER: BadgeId[] = ["first", "halfway", "patience", "ready", "detective", "family"];

export function earnedBadges(input: {
  saved: number;
  goalPrice: number | null;
  contributors: number;
  quizPassed: boolean;
  vinGuideDone: boolean;
}): BadgeId[] {
  const badges: BadgeId[] = [];
  if (input.saved > 0) badges.push("first");
  if (input.goalPrice && input.saved >= input.goalPrice * 0.5) badges.push("halfway");
  const firstSweet = [...meta.sweetSpots].sort((a, b) => a - b)[0];
  if (firstSweet && input.saved >= firstSweet) badges.push("patience");
  if (input.quizPassed) badges.push("ready");
  if (input.vinGuideDone) badges.push("detective");
  if (input.contributors >= 2) badges.push("family");
  return badges;
}
