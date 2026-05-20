import { z } from "zod";

// ---------------------------------------------------------------------------
// Query schemas
// ---------------------------------------------------------------------------

/**
 * GET /commentary  — optional limit query param.
 * Coerced to integer, must be positive and ≤ 100.
 */
export const listCommentaryQuerySchema = z.object({
  limit: z
    .coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional(),
});

// ---------------------------------------------------------------------------
// Body schemas
// ---------------------------------------------------------------------------

/**
 * POST /commentary — create a new commentary entry.
 *
 * Fields:
 *   minute    — non-negative integer (e.g. 45, 90+3 represented as elapsed minutes)
 *   sequence  — ordering key within the same minute (non-negative integer)
 *   period    — free-form period label, e.g. "1H", "2H", "ET1", "PEN"
 *   eventType — category of the event, e.g. "GOAL", "YELLOW_CARD", "SUBSTITUTION"
 *   actor     — primary subject of the event (player name / id)
 *   team      — team identifier associated with the event
 *   message   — human-readable commentary text (required)
 *   metadata  — arbitrary key-value pairs for sport-specific data
 *   tags      — searchable labels attached to this entry
 */
export const createCommentarySchema = z.object({
  minute: z
    .number()
    .int("minute must be an integer")
    .nonnegative("minute must be 0 or greater"),

  sequence: z
    .number()
    .int("sequence must be an integer")
    .nonnegative("sequence must be 0 or greater")
    .optional(),

  period: z
    .string()
    .min(1, "period cannot be empty")
    .optional(),

  eventType: z
    .string()
    .min(1, "eventType cannot be empty")
    .optional(),

  actor: z
    .string()
    .min(1, "actor cannot be empty")
    .optional(),

  team: z
    .string()
    .min(1, "team cannot be empty")
    .optional(),

  message: z
    .string()
    .min(1, "message is required"),

  metadata: z
    .record(z.string(), z.unknown())
    .optional(),

  tags: z
    .array(z.string().min(1, "each tag must be a non-empty string"))
    .optional(),
});
