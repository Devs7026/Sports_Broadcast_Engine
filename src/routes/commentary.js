import { Router } from "express";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { matchIdParamSchema } from "../validation/matches.js";
import { createCommentarySchema, listCommentaryQuerySchema } from "../validation/commentary.js";
import { eq, desc } from "drizzle-orm";

export const commentaryRouter = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// GET /matches/:id/commentary  — list commentary for a match
// ---------------------------------------------------------------------------

const MAX_LIMIT = 100;

commentaryRouter.get("/", async (req, res) => {
    // 1. Validate route param :id
    const parsedParam = matchIdParamSchema.safeParse(req.params);
    if (!parsedParam.success) {
        return res.status(400).json({
            error: "Invalid match ID.",
            details: parsedParam.error.issues,
        });
    }

    // 2. Validate query string (?limit=)
    const parsedQuery = listCommentaryQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
        return res.status(400).json({
            error: "Invalid query parameters.",
            details: parsedQuery.error.issues,
        });
    }

    const { id: matchId } = parsedParam.data;
    const limit = Math.min(parsedQuery.data.limit ?? MAX_LIMIT, MAX_LIMIT);

    // 3. Fetch commentary rows filtered by matchId
    try {
        const data = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        return res.status(200).json({ data });
    } catch (e) {
        return res.status(500).json({
            error: "Failed to fetch commentary.",
            details: JSON.stringify(e),
        });
    }
});

// ---------------------------------------------------------------------------
// POST /matches/:id/commentary  — create a commentary entry
// ---------------------------------------------------------------------------

commentaryRouter.post("/", async (req, res) => {
    // 1. Validate route param :id
    const parsedParam = matchIdParamSchema.safeParse(req.params);
    if (!parsedParam.success) {
        return res.status(400).json({
            error: "Invalid match ID.",
            details: parsedParam.error.issues,
        });
    }

    // 2. Validate request body
    const parsedBody = createCommentarySchema.safeParse(req.body);
    if (!parsedBody.success) {
        return res.status(400).json({
            error: "Invalid payload.",
            details: parsedBody.error.issues,
        });
    }

    const { id: matchId } = parsedParam.data;
    const { message, minute, sequence, period, eventType, actor, team, metadata, tags } =
        parsedBody.data;

    // 3. Insert into the commentary table
    try {
        const [entry] = await db
            .insert(commentary)
            .values({
                matchId,
                minute,
                sequence,
                period,
                eventType,
                actor,
                team,
                message,
                metadata: metadata ?? null,
                tags: tags ?? null,
            })
            .returning();

        if (res.app.locals.broadcastCommentary) {
            res.app.locals.broadcastCommentary(matchId, entry);
        }

        return res.status(201).json({ data: entry });
    } catch (e) {
        return res.status(500).json({
            error: "Failed to create commentary entry.",
            details: JSON.stringify(e),
        });
    }
});
