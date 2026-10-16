/** Сколько месяцев копить, пока взнос обгоняет цель с ростом цены. null — за 10 лет не догнать. */
export function monthsToGoal(saved: number, monthly: number, target: number, inflation = 0.007): number | null {
  if (saved >= target) return 0;
  if (monthly <= 0) return null;
  for (let month = 0; month <= 120; month++) {
    if (saved + monthly * month >= target * Math.pow(1 + inflation, month)) return month;
  }
  return null;
}

export function addMonths(isoDate: string, months: number): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, day));
}
