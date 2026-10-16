import { plural, rub } from "../format";

const DAY = 86_400_000;
const MARKET_MOVE = 0.03;

export function daysSince(lastSeenAt: string, today: string): number {
  const from = Date.parse(`${lastSeenAt}T00:00:00Z`);
  const to = Date.parse(`${today}T00:00:00Z`);
  return Math.round((to - from) / DAY);
}

export function absenceDue(lastSeenAt: string | null, today: string): boolean {
  if (!lastSeenAt) return false;
  return daysSince(lastSeenAt, today) >= 14;
}

export type MarketShift = {
  name: string;
  seed: boolean;
  previous: number | null;
  current: number;
  month: string;
  listings: number;
};

export type AbsenceInput = {
  lastSeenAt: string;
  saved: number;
  deposits: { amount: number; date: string }[];
  tiers: number[];
  market: MarketShift[];
  beforeName: string | null;
  afterName: string | null;
  goalName: string | null;
  monthsBefore: number | null;
  monthsAfter: number | null;
};

function grouped(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.abs(Math.round(amount)));
}

/** До трёх строк. Пустой массив — карточку не показываем. */
export function absenceLines(input: AbsenceInput): string[] {
  const lines: string[] = [];
  const since = input.deposits.filter((deposit) => deposit.date > input.lastSeenAt);
  const added = since.filter((deposit) => deposit.amount > 0);
  const removed = since.filter((deposit) => deposit.amount < 0);
  const previousSaved = input.saved - since.reduce((sum, deposit) => sum + deposit.amount, 0);
  const money: string[] = [];
  if (added.length) {
    const sum = added.reduce((total, deposit) => total + deposit.amount, 0);
    money.push(`+${rub(sum)} за ${added.length} ${plural(added.length, "взнос", "взноса", "взносов")}`);
  }
  if (removed.length) {
    const sum = Math.abs(removed.reduce((total, deposit) => total + deposit.amount, 0));
    money.push(`−${rub(sum)} за ${removed.length} ${plural(removed.length, "снятие", "снятия", "снятий")}`);
  }
  const crossed = input.tiers.filter((tier) => previousSaved < tier && input.saved >= tier);
  if (crossed.length) money.push(`пройден столб ${grouped(crossed[crossed.length - 1])}`);
  if (money.length) lines.push(money.join(", "));

  const move = input.market.find((item) => {
    if (item.seed || item.previous === null || item.previous <= 0) return false;
    return Math.abs(item.current - item.previous) / item.previous >= MARKET_MOVE;
  });
  if (move && move.previous) {
    const percent = Math.round(((move.current - move.previous) / move.previous) * 100);
    const sign = percent < 0 ? "−" : "+";
    lines.push(`Медиана ${move.name} ${sign}${Math.abs(percent)}% (снимок ${move.month}, ${move.listings} объявлений)`);
  }

  if (input.beforeName && input.afterName && input.beforeName !== input.afterName) {
    lines.push(`Сегодня теперь ${input.afterName} вместо ${input.beforeName}`);
  } else if (
    input.goalName &&
    input.monthsBefore !== null &&
    input.monthsAfter !== null &&
    input.monthsAfter < input.monthsBefore
  ) {
    const delta = input.monthsBefore - input.monthsAfter;
    lines.push(delta === 1 ? `До ${input.goalName} на месяц ближе` : `До ${input.goalName} на ${delta} мес. ближе`);
  }

  return lines.slice(0, 3);
}
