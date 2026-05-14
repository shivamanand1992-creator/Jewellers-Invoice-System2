import { Router, type IRouter } from "express";
import { requireAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import {
  GetProfileResponse,
  UpsertProfileBody,
  UpsertProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profile", requireAuth(), async (req, res): Promise<void> => {
  const userId = req.auth.userId;
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));

  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(GetProfileResponse.parse(profile));
});

router.put("/profile", requireAuth(), async (req, res): Promise<void> => {
  const userId = req.auth.userId;
  const parsed = UpsertProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));

  let profile;
  if (existing.length > 0) {
    [profile] = await db
      .update(profilesTable)
      .set({ ...parsed.data, userId })
      .where(eq(profilesTable.userId, userId))
      .returning();
  } else {
    [profile] = await db
      .insert(profilesTable)
      .values({ ...parsed.data, userId })
      .returning();
  }

  res.json(UpsertProfileResponse.parse(profile));
});

export default router;
