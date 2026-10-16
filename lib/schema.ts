import { z } from "zod";

export const Risk = z.object({
  title: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  stage: z.enum(["purchase", "ownership"]),
  howToCheck: z.string(),
  repairCostRub: z.tuple([z.number(), z.number()]).optional(),
  sources: z.array(z.string().url()).min(1),
});

export const Model = z.object({
  slug: z.string(),
  aliases: z.array(z.string()).optional(),
  brand: z.string(),
  model: z.string(),
  generation: z.string(),
  years: z.tuple([z.number(), z.number()]),
  body: z.enum(["sedan", "hatchback", "wagon", "crossover", "minivan"]),
  summary: z.string().optional(),
  fuelLPer100: z.number().positive().optional(),
  engines: z
    .array(
      z.object({
        volumeL: z.number(),
        hp: z.number(),
        fuel: z.enum(["petrol", "diesel", "hybrid"]),
        timing: z.enum(["belt", "chain"]),
        recommended: z.boolean(),
      }),
    )
    .min(1),
  gearboxes: z
    .array(
      z.object({
        type: z.enum(["AT", "CVT", "DCT", "AMT"]),
        name: z.string(),
        verdict: z.enum(["recommended", "acceptable", "avoid"]),
      }),
    )
    .min(1),
  mileage: z.object({
    goodMax: z.number(),
    okMax: z.number(),
    avoidFrom: z.number(),
  }),
  subScores: z.object({
    reliability: z.number().min(0).max(10),
    safety: z.number().min(0).max(10),
    ownershipCost: z.number().min(0).max(10),
    purchaseRisk: z.number().min(0).max(10),
    liquidity: z.number().min(0).max(10),
  }),
  subScoreNotes: z.record(z.string(), z.string()),
  risks: z.array(Risk),
  avoid: z.array(z.string()),
  checklist: z.array(z.string()).min(1),
});

export const PriceSnapshot = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  slug: z.string(),
  region: z.literal("moscow"),
  sampleSize: z.number().int(),
  p25: z.number(),
  median: z.number(),
  p75: z.number(),
  medianMileageKm: z.number(),
  medianYear: z.number(),
  confidence: z.enum(["high", "medium", "low"]),
  sources: z.array(z.string().url()),
  notes: z.string().optional(),
});

export const SnapshotFile = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  generatedAt: z.string(),
  marketSummary: z.object({
    trend: z.string(),
    sources: z.array(z.string().url()),
  }),
  snapshots: z.array(PriceSnapshot),
  newModels: z.array(z.unknown()).default([]),
  flags: z.array(z.object({ slug: z.string(), issue: z.string() })).default([]),
  changelog: z.string().optional(),
});

export type Risk = z.infer<typeof Risk>;
export type Model = z.infer<typeof Model>;
export type SubScores = Model["subScores"];
export type PriceSnapshot = z.infer<typeof PriceSnapshot>;
export type SnapshotFile = z.infer<typeof SnapshotFile>;
