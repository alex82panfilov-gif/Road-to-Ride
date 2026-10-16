import { approxRub } from "../format";
import { displayName, type CatalogItem } from "../market";
import type { DriverProfile } from "../meta";
import type { WithdrawalReason } from "../storage";
import { purchasePrice } from "./market";

export const withdrawalReasonLabel: Record<WithdrawalReason, string> = {
  repair: "ремонт",
  lent: "одолжил",
  other: "другое",
};

/** Пусто, если снятие можно записать. Баланс после записи не уходит ниже нуля. */
export function withdrawalError(balance: number, amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Напишите сумму цифрами.";
  if (amount > balance) return "Нельзя снять больше, чем есть в копилке.";
  return null;
}

/** Спокойная строка, если после снятия прежняя машина снова впереди. Уровни не штрафуются. */
export function setbackLine(previous: CatalogItem | null, saved: number, driver?: DriverProfile): string | null {
  if (!previous) return null;
  const gap = purchasePrice(previous, driver) - saved;
  if (gap <= 0) return null;
  return `Бывает. До ${displayName(previous)} снова ${approxRub(gap)}.`;
}
