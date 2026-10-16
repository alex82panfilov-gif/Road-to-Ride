import { z } from "zod";

export const GearboxType = z.enum(["AT", "CVT", "DCT", "AMT", "MT"]);

export const Engine = z
  .object({
    code: z.string(),
    volumeL: z.number(),
    hp: z.number(),
    fuel: z.enum(["petrol", "diesel", "hybrid"]),
    timing: z.enum(["belt", "chain"]),
    recommended: z.boolean(),
    years: z.tuple([z.number(), z.number()]).optional(),
  })
  .strict();

export const Gearbox = z
  .object({
    type: GearboxType,
    name: z.string(),
    verdict: z.enum(["recommended", "acceptable", "avoid"]),
    engineCodes: z.array(z.string()).optional(),
    years: z.tuple([z.number(), z.number()]).optional(),
    note: z.string().optional(),
  })
  .strict();

export const Risk = z
  .object({
    title: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    stage: z.enum(["purchase", "ownership"]),
    howToCheck: z.string(),
    repairCostRub: z.tuple([z.number(), z.number()]).optional(),
    sources: z.array(z.string().url()).min(1),
  })
  .strict();

const Score = z.number().min(0).max(10);

export const BudgetRule = z
  .object({
    from: z.number(),
    to: z.number(),
    verdict: z.enum(["caution", "avoid"]),
    reason: z.string(),
    insteadSlugs: z.array(z.string()).optional(),
  })
  .strict();

export const Trap = z
  .object({
    id: z.string(),
    title: z.string(),
    priceRange: z.tuple([z.number(), z.number()]),
    verdict: z.enum(["caution", "avoid"]),
    reason: z.string(),
    howToSpot: z.string(),
    insteadSlugs: z.array(z.string()).default([]),
  })
  .strict();

export const TrapsFile = z.array(Trap);

export const Model = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    aliases: z.array(z.string()).optional(),
    brand: z.string(),
    model: z.string(),
    generation: z.string(),
    years: z.tuple([z.number(), z.number()]),
    body: z.enum(["sedan", "hatchback", "wagon", "crossover", "minivan"]),
    summary: z.string().optional(),
    fuelLPer100: z.number().positive().optional(),
    engines: z.array(Engine).min(1),
    gearboxes: z.array(Gearbox).min(1),
    mileage: z.object({ goodMax: z.number(), okMax: z.number(), avoidFrom: z.number() }).strict(),
    subScores: z
      .object({
        reliability: Score,
        safety: Score,
        ownershipCost: Score,
        purchaseRisk: Score,
        liquidity: Score,
      })
      .strict(),
    subScoreNotes: z.record(z.string(), z.string()),
    risks: z.array(Risk),
    avoid: z.array(z.string()),
    checklist: z.array(z.string()),
    listingRules: z.array(z.string()).optional(),
    autoruPath: z.string().regex(/^[a-z0-9/-]+$/).optional(),
    budgetRules: z.array(BudgetRule).optional(),
  })
  .strict();

export const Listing = z
  .object({
    id: z.string().min(1),
    platform: z.enum(["drom", "autoru", "avito", "other"]),
    url: z.string().url().optional(),
    year: z.number().int(),
    mileageKm: z.number().int().nonnegative(),
    priceRub: z.number().int().positive(),
    engineL: z.number(),
    hp: z.number().optional(),
    gearboxType: GearboxType,
    gearboxRaw: z.string(),
    owners: z.number().int().optional(),
    remarks: z.array(z.string()).optional(),
  })
  .strict();

export const Snapshot = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    slug: z.string(),
    region: z.literal("moscow"),
    sampleSize: z.number().int().nonnegative(),
    p25: z.number(),
    median: z.number(),
    p75: z.number(),
    medianMileageKm: z.number(),
    medianYear: z.number(),
    confidence: z.enum(["high", "medium", "low"]),
    sources: z.array(z.string().url()).min(1),
    notes: z.string().optional(),
    listings: z.array(Listing).optional(),
  })
  .strict();

export const PriceSnapshot = Snapshot;

export const SnapshotFile = z
  .object({
    schemaVersion: z.literal(2),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    generatedAt: z.string().datetime({ offset: true }),
    seed: z.boolean().optional(),
    marketSummary: z.object({ trend: z.string(), sources: z.array(z.string().url()).min(1) }).strict(),
    snapshots: z.array(Snapshot),
    newModels: z.array(z.unknown()).default([]),
    flags: z.array(z.object({ slug: z.string(), issue: z.string() }).strict()).default([]),
    changelog: z.string().optional(),
  })
  .strict();

export type Model = z.infer<typeof Model>;
export type TModel = Model;
export type Risk = z.infer<typeof Risk>;
export type SubScores = Model["subScores"];
export type TListing = z.infer<typeof Listing>;
export type PriceSnapshot = z.infer<typeof Snapshot>;
export type TSnapshot = PriceSnapshot;
export type SnapshotFile = z.infer<typeof SnapshotFile>;
export type TSnapshotFile = SnapshotFile;
export type TTrap = z.infer<typeof Trap>;
export type BudgetRule = z.infer<typeof BudgetRule>;
