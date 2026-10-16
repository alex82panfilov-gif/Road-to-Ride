"use client";

import { Sheet } from "@/components/ui/sheet";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { labels } from "@/lib/content";
import { groupRubles, parseRubles, todayIso } from "@/lib/format";
import { withdrawalError } from "@/lib/view/ledger";
import {
  defaultUser,
  loadUser,
  parseImport,
  saveUser,
  savedAmount,
  type ContributorId,
  type Deposit,
  type UserData,
  type WithdrawalReason,
} from "@/lib/storage";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type UserApi = {
  ready: boolean;
  data: UserData;
  saved: number;
  update: (recipe: (current: UserData) => UserData) => void;
  addDeposit: (input: { amount: number; date: string; by: ContributorId; note?: string }) => void;
  addWithdrawal: (input: { amount: number; date: string; reason: WithdrawalReason }) => void;
  removeDeposit: (id: string) => void;
  replaceAll: (next: UserData) => void;
};

const UserContext = createContext<UserApi | null>(null);
const UiContext = createContext<{
  depositOpen: boolean;
  setDepositOpen: (open: boolean) => void;
  withdrawOpen: boolean;
  setWithdrawOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
} | null>(null);

export function useUser() {
  const value = useContext(UserContext);
  if (!value) throw new Error("useUser вне провайдера");
  return value;
}

export function useUi() {
  const value = useContext(UiContext);
  if (!value) throw new Error("useUi вне провайдера");
  return value;
}

function applyTheme(theme: UserData["theme"]) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

function UserState({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<UserData>(defaultUser);
  const [ready, setReady] = useState(false);
  const toast = useToast();
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    const loaded = loadUser();
    setData(loaded);
    applyTheme(loaded.theme);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveUser(data);
    applyTheme(data.theme);
  }, [data, ready]);

  const api = useMemo<UserApi>(() => {
    const update = (recipe: (current: UserData) => UserData) => setData((current) => recipe(current));
    return {
      ready,
      data,
      saved: savedAmount(data),
      update,
      addDeposit: (input) => {
        const deposit: Deposit = { id: crypto.randomUUID(), ...input };
        update((current) => ({ ...current, deposits: [...current.deposits, deposit] }));
      },
      addWithdrawal: (input) => {
        const error = withdrawalError(savedAmount(dataRef.current), input.amount);
        if (error) return;
        const deposit: Deposit = {
          id: crypto.randomUUID(),
          amount: -input.amount,
          date: input.date,
          by: "me",
          reason: input.reason,
        };
        setData((current) => ({ ...current, deposits: [...current.deposits, deposit] }));
        toast({
          text: "Снято из копилки.",
          action: "Отменить",
          duration: 8000,
          onAction: () =>
            setData((current) => ({ ...current, deposits: current.deposits.filter((item) => item.id !== deposit.id) })),
        });
      },
      removeDeposit: (id) => {
        const removed = dataRef.current.deposits.find((item) => item.id === id);
        if (!removed) return;
        setData((current) => ({ ...current, deposits: current.deposits.filter((item) => item.id !== id) }));
        toast({
          text: removed.amount < 0 ? "Снятие удалено." : "Взнос удалён.",
          action: "Отменить",
          duration: 8000,
          onAction: () =>
            setData((current) =>
              current.deposits.some((item) => item.id === removed.id)
                ? current
                : { ...current, deposits: [...current.deposits, removed] },
            ),
        });
      },
      replaceAll: (next) => setData(next),
    };
  }, [data, ready, toast]);

  return <UserContext.Provider value={api}>{children}</UserContext.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <ToastProvider>
      <UserState>
        <UiContext.Provider value={{ depositOpen, setDepositOpen, withdrawOpen, setWithdrawOpen, searchOpen, setSearchOpen }}>
          {children}
          <DepositSheet open={depositOpen} onClose={() => setDepositOpen(false)} />
          <WithdrawSheet open={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
        </UiContext.Provider>
      </UserState>
    </ToastProvider>
  );
}

function DepositSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addDeposit, data } = useUser();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [by, setBy] = useState<ContributorId>("me");
  const [note, setNote] = useState("");
  const [amountError, setAmountError] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);

  useEffect(() => {
    setDate(todayIso());
  }, []);

  useLayoutEffect(() => {
    const input = amountRef.current;
    const digitsBefore = caretDigits.current;
    if (!input || digitsBefore === null || document.activeElement !== input) return;
    let seen = 0;
    let position = amount.length;
    for (let index = 0; index < amount.length; index += 1) {
      if (/\d/.test(amount[index])) seen += 1;
      if (seen === digitsBefore) {
        position = index + 1;
        break;
      }
    }
    if (digitsBefore === 0) position = 0;
    input.setSelectionRange(position, position);
    caretDigits.current = null;
  }, [amount]);

  return (
    <Sheet open={open} title={data.deposits.length ? "Новый взнос" : "Первый взнос"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const value = parseRubles(amount);
          if (value === null) {
            setAmountError("Напишите сумму цифрами, например 300 000.");
            return;
          }
          setAmountError("");
          addDeposit({ amount: value, date, by, note: note.trim() || undefined });
          setAmount("");
          setNote("");
          onClose();
        }}
      >
        <label className="block text-sm">
          Сумма, ₽
          <input
            ref={amountRef}
            inputMode="numeric"
            required
            value={amount}
            aria-invalid={amountError ? true : undefined}
            onChange={(event) => {
              const raw = event.target.value;
              const selection = event.target.selectionStart ?? raw.length;
              const digits = raw.replace(/\D/g, "");
              const removedZeros = digits.length - digits.replace(/^0+(?=\d)/, "").length;
              const digitsBefore = raw.slice(0, selection).replace(/\D/g, "").length;
              caretDigits.current = Math.max(0, digitsBefore - removedZeros);
              setAmount(groupRubles(raw));
              if (amountError) setAmountError("");
            }}
            className="num mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4"
          />
          {amountError ? <span className="mt-1 block text-danger">{amountError}</span> : null}
        </label>
        <label className="block text-sm">
          Дата
          <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4" />
        </label>
        <label className="block text-sm">
          От кого
          <select value={by} onChange={(event) => setBy(event.target.value as ContributorId)} className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4">
            {Object.entries(labels.contributors).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Заметка
          <input value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4" />
        </label>
        <button type="submit" className="h-12 w-full rounded-full bg-accent font-medium text-accent-ink">
          Добавить взнос
        </button>
      </form>
    </Sheet>
  );
}

function WithdrawSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addWithdrawal, saved } = useUser();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState<WithdrawalReason>("repair");
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    setDate(todayIso());
  }, []);

  return (
    <Sheet open={open} title="Снять из копилки" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const value = parseRubles(amount);
          if (value === null) {
            setAmountError("Напишите сумму цифрами, например 50 000.");
            return;
          }
          const error = withdrawalError(saved, value);
          if (error) {
            setAmountError(error);
            return;
          }
          setAmountError("");
          addWithdrawal({ amount: value, date, reason });
          setAmount("");
          onClose();
        }}
      >
        <label className="block text-sm">
          Сумма, ₽
          <input
            inputMode="numeric"
            required
            value={amount}
            aria-invalid={amountError ? true : undefined}
            onChange={(event) => {
              setAmount(groupRubles(event.target.value));
              if (amountError) setAmountError("");
            }}
            className="num mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4"
          />
          {amountError ? <span className="mt-1 block text-danger">{amountError}</span> : null}
        </label>
        <label className="block text-sm">
          Причина
          <select value={reason} onChange={(event) => setReason(event.target.value as WithdrawalReason)} className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4">
            <option value="repair">Ремонт</option>
            <option value="lent">Одолжил</option>
            <option value="other">Другое</option>
          </select>
        </label>
        <label className="block text-sm">
          Дата
          <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 h-12 w-full rounded-2xl bg-canvas-secondary px-4" />
        </label>
        <button type="submit" className="h-12 w-full rounded-full bg-accent font-medium text-accent-ink">
          Снять
        </button>
      </form>
    </Sheet>
  );
}

export function importUserJson(raw: string): UserData {
  return parseImport(raw);
}
