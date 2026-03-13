import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
};

// ---------------------------------------------------------------------------
// Query / Param schemas
// ---------------------------------------------------------------------------

/**
 * GET /matches  — optional limit query param.
 * Coerced to integer, must be positive and ≤ 100.
 */
export const listMatchesQuerySchema = z.object({
  limit: z
    .coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional(),
});

/**
 * Route param :id — coerced to a positive integer.
 */
export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Body schemas
// ---------------------------------------------------------------------------

/**
 * POST /matches — create a new match.
 */
export const createMatchSchema = z
  .object({
    sport:    z.string().min(1, "sport is required"),
    homeTeam: z.string().min(1, "homeTeam is required"),
    awayTeam: z.string().min(1, "awayTeam is required"),

    startTime: z.string(),
    endTime:   z.string(),

    homeScore: z.coerce.number().int().nonnegative().optional(),
    awayScore: z.coerce.number().int().nonnegative().optional(),
  })
  // Validate that startTime and endTime are valid ISO date strings.
  .refine(
    (data) => !isNaN(Date.parse(data.startTime)),
    { message: "startTime must be a valid ISO date string", path: ["startTime"] }
  )
  .refine(
    (data) => !isNaN(Date.parse(data.endTime)),
    { message: "endTime must be a valid ISO date string", path: ["endTime"] }
  )
  // Validate that endTime is chronologically after startTime.
  .superRefine((data, ctx) => {
    const start = Date.parse(data.startTime);
    const end   = Date.parse(data.endTime);

    if (!isNaN(start) && !isNaN(end) && end <= start) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "endTime must be after startTime",
        path:    ["endTime"],
      });
    }
  });

/**
 * PUT /matches/:id/score — update the score of an existing match.
 */
export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
