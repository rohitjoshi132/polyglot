import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { usersTable, projectsTable } from "@workspace/db/schema";
import { eq, desc, and, count } from "drizzle-orm";

const router: IRouter = Router();

/**
 * Helper: get the DB user ID from Firebase UID
 */
async function getUserId(firebaseUid: string): Promise<number | null> {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.firebaseUid, firebaseUid))
    .limit(1);
  return user?.id ?? null;
}

/**
 * GET /projects — List user's saved projects (paginated)
 */
router.get("/projects", requireAuth, async (req, res) => {
  const userId = await getUserId(req.firebaseUser!.uid);
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const page = Math.max(1, Number(req.query["page"]) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query["limit"]) || 20));
  const offset = (page - 1) * limit;

  const [projects, [{ count: total }]] = await Promise.all([
    db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, userId))
      .orderBy(desc(projectsTable.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(projectsTable)
      .where(eq(projectsTable.userId, userId)),
  ]);

  res.json({
    projects,
    total: Number(total),
    page,
    limit,
    totalPages: Math.ceil(Number(total) / limit),
  });
});

/**
 * POST /projects — Save a new project
 */
router.post("/projects", requireAuth, async (req, res) => {
  const userId = await getUserId(req.firebaseUser!.uid);
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { title, code, language, filename } = req.body as {
    title?: string;
    code?: string;
    language?: string;
    filename?: string;
  };

  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      userId,
      title: title.trim(),
      code,
      language: language || null,
      filename: filename || null,
    })
    .returning();

  res.status(201).json(project);
});

/**
 * GET /projects/:id — Get a specific project
 */
router.get("/projects/:id", requireAuth, async (req, res) => {
  const userId = await getUserId(req.firebaseUser!.uid);
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const id = Number(req.params["id"]);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(project);
});

/**
 * PUT /projects/:id — Update a saved project
 */
router.put("/projects/:id", requireAuth, async (req, res) => {
  const userId = await getUserId(req.firebaseUser!.uid);
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const id = Number(req.params["id"]);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const { title, code, language, filename } = req.body as {
    title?: string;
    code?: string;
    language?: string;
    filename?: string;
  };

  // Verify ownership
  const [existing] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [updated] = await db
    .update(projectsTable)
    .set({
      ...(title ? { title: title.trim() } : {}),
      ...(code !== undefined ? { code } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(filename !== undefined ? { filename } : {}),
      updatedAt: new Date(),
    })
    .where(eq(projectsTable.id, id))
    .returning();

  res.json(updated);
});

/**
 * DELETE /projects/:id — Delete a saved project
 */
router.delete("/projects/:id", requireAuth, async (req, res) => {
  const userId = await getUserId(req.firebaseUser!.uid);
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const id = Number(req.params["id"]);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const [deleted] = await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({ message: "Project deleted", id });
});

export default router;
