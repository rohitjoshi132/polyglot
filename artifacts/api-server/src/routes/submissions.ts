import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { submissionsTable } from "@workspace/db/schema";
import { eq, desc, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/submissions", async (req, res) => {
  const page = Math.max(1, Number(req.query["page"]) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
  const language = req.query["language"] as string | undefined;
  const offset = (page - 1) * limit;

  let query = db.select().from(submissionsTable).$dynamic();
  let countQuery = db.select({ count: count() }).from(submissionsTable).$dynamic();

  if (language) {
    query = query.where(eq(submissionsTable.detectedLanguage, language));
    countQuery = countQuery.where(eq(submissionsTable.detectedLanguage, language));
  }

  const [submissions, [{ count: total }]] = await Promise.all([
    query.orderBy(desc(submissionsTable.createdAt)).limit(limit).offset(offset),
    countQuery,
  ]);

  res.json({
    submissions,
    total: Number(total),
    page,
    limit,
    totalPages: Math.ceil(Number(total) / limit),
  });
});

router.get("/submissions/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid submission ID" });
    return;
  }

  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, id))
    .limit(1);

  if (!submission) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  res.json(submission);
});

export default router;
