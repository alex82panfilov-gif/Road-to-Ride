import { z } from "zod";
import { DEFAULT_DRIVER, meta, type DriverProfile } from "./meta";

export const STORAGE_KEY = "rtr:v1";
export const THEME_KEY = "rtr:theme";
const LEGACY_KEYS = ["fm:v1"];
const LEGACY_THEME_KEY = "fm:theme";

export const contributorIds = ["me", "dad", "mom", "gift", "other"] as const;
export type ContributorId = (typeof contributorIds)[number];

export type Deposit = {
  id: string;
  amount: number;
  date: string;
  by: ContributorId;
  note?: string;
};

export type ChecklistState = {
  checked: string[];
  notes: Record<string, string>;
};

export type UserData = {
  version: 1;
  deposits: Deposit[];
  goalSlug: string | null;
  monthly: number;
  inflation: number | null;
  quizPassed: boolean;
  vinGuideDone: boolean;
  vinSectionRead: boolean;
  mode: "beginner" | "expert";
  theme: "system" | "light" | "dark";
  checklists: Record<string, ChecklistState>;
  seenLevel: number;
  backupReminderMonth: string | null;
  driver: DriverProfile;
  /** Дата прав категории B. null — меньше года назад. */
  licenseDate: string | null;
  /** Вписан в полис родителей и ездит без аварий. */
  onParentPolicy: boolean;
};

const DepositSchema = z.object({
  id: z.string(),
  amount: z.number().positive(),
  date: z.string(),
  by: z.enum(contributorIds),
  note: z.string().optional(),
});

const UserSchema = z.object({
  version: z.literal(1),
  deposits: z.array(DepositSchema),
  goalSlug: z.string().nullable(),
  monthly: z.number().nonnegative(),
  inflation: z.number().min(0).max(0.2).nullable(),
  quizPassed: z.boolean(),
  vinGuideDone: z.boolean(),
  vinSectionRead: z.boolean(),
  mode: z.enum(["beginner", "expert"]),
  theme: z.enum(["system", "light", "dark"]),
  checklists: z.record(
    z.string(),
    z.object({
      checked: z.array(z.string()),
      notes: z.record(z.string(), z.string()),
    }),
  ),
  seenLevel: z.number().int().nonnegative(),
  backupReminderMonth: z.string().nullable(),
  driver: z.object({
    age: z.number().min(0).max(120),
    experienceYears: z.number().min(0).max(60),
  }),
  licenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  onParentPolicy: z.boolean(),
});

export function defaultUser(): UserData {
  return {
    version: 1,
    deposits: [],
    goalSlug: null,
    monthly: 0,
    inflation: null,
    quizPassed: false,
    vinGuideDone: false,
    vinSectionRead: false,
    mode: "beginner",
    theme: "system",
    checklists: {},
    seenLevel: 0,
    backupReminderMonth: null,
    driver: { ...DEFAULT_DRIVER },
    licenseDate: null,
    onParentPolicy: false,
  };
}

export function savedAmount(data: UserData): number {
  return data.deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
}

export function inflationOf(data: UserData): number {
  return data.inflation ?? meta.monthlyInflation;
}

function licenseOf(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function migrate(raw: unknown): UserData {
  const base = defaultUser();
  if (!raw || typeof raw !== "object") return base;
  const record = raw as Record<string, unknown>;
  const candidate = {
    ...base,
    ...record,
    version: 1,
    licenseDate: licenseOf(record.licenseDate),
    onParentPolicy: record.onParentPolicy === true,
    driver: { ...base.driver, ...(record.driver as object) },
  };
  const parsed = UserSchema.safeParse(candidate);
  return parsed.success ? parsed.data : base;
}

export function loadUser(): UserData {
  if (typeof window === "undefined") return defaultUser();
  try {
    const theme = window.localStorage.getItem(THEME_KEY) ?? window.localStorage.getItem(LEGACY_THEME_KEY);
    if (theme && !window.localStorage.getItem(THEME_KEY)) window.localStorage.setItem(THEME_KEY, theme);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
    for (const key of LEGACY_KEYS) {
      const old = window.localStorage.getItem(key);
      if (!old) continue;
      window.localStorage.setItem(STORAGE_KEY, old);
      window.localStorage.removeItem(key);
      return migrate(JSON.parse(old));
    }
    return defaultUser();
  } catch {
    return defaultUser();
  }
}

export function saveUser(data: UserData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.localStorage.setItem(THEME_KEY, data.theme);
}

export function parseImport(raw: string): UserData {
  const json = JSON.parse(raw) as Record<string, unknown>;
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("Файл копилки не подошёл");
  if ("app" in json) {
    if (json.app !== "road-to-ride" && json.app !== "first-machine") throw new Error("Файл копилки не подошёл");
    delete json.app;
  }
  if (!Array.isArray(json.deposits)) throw new Error("Файл копилки не подошёл");
  const base = defaultUser();
  const driver = json.driver && typeof json.driver === "object" ? (json.driver as object) : {};
  const parsed = UserSchema.safeParse({
    ...base,
    ...json,
    version: 1,
    licenseDate: licenseOf(json.licenseDate),
    onParentPolicy: json.onParentPolicy === true,
    driver: { ...base.driver, ...driver },
  });
  if (!parsed.success) throw new Error("Файл копилки не подошёл");
  return parsed.data;
}

export function exportPayload(data: UserData) {
  return { app: "road-to-ride" as const, ...data };
}

export function backupFilename(day: string): string {
  return `road-to-ride-backup-${day}.json`;
}

export function buildIcs(dayOfMonth = 5): string {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const start = `${now.getFullYear()}${month}${String(dayOfMonth).padStart(2, "0")}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Road to Ride//RU",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:savings-${stamp}@road-to-ride`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    "RRULE:FREQ=MONTHLY;BYMONTHDAY=5",
    "SUMMARY:Пополнить копилку · Road to Ride",
    "DESCRIPTION:Напоминание сайта Road to Ride. Push-уведомлений нет — только ваш календарь.",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
