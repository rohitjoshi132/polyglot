import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/**
 * POST /auth/sync — Create or update user record after Firebase sign-in
 */
router.post("/auth/sync", requireAuth, async (req, res) => {
  const { uid, email, name, picture } = req.firebaseUser!;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  // Upsert user by firebaseUid
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.firebaseUid, uid))
    .limit(1);

  if (existing.length > 0) {
    // Update existing user
    const [updated] = await db
      .update(usersTable)
      .set({
        email,
        displayName: name || existing[0]!.displayName,
        photoUrl: picture || existing[0]!.photoUrl,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.firebaseUid, uid))
      .returning();

    res.json(updated);
  } else {
    // Create new user
    const [created] = await db
      .insert(usersTable)
      .values({
        firebaseUid: uid,
        email,
        displayName: name || null,
        photoUrl: picture || null,
      })
      .returning();

    res.json(created);
  }
});

/**
 * GET /auth/me — Get current authenticated user's profile
 */
router.get("/auth/me", requireAuth, async (req, res) => {
  const { uid } = req.firebaseUser!;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.firebaseUid, uid))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found. Please sync first." });
    return;
  }

  res.json(user);
});

export default router;
