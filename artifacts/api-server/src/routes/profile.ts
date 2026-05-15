import { Router, type IRouter } from "express";
import { requireAuth, type AuthRequest } from '../middlewares/requireAuth';
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import {
  GetProfileResponse,
  UpsertProfileBody,
  UpsertProfileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profile", requireAuth(), async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));

    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(GetProfileResponse.parse(profile));
  } catch (err: any) {
    console.error("GET /profile error:", err?.message, err?.code, err?.detail);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

router.put("/profile", requireAuth(), async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;
    console.log("PUT /profile userId:", userId, "body:", JSON.stringify(req.body));

    const parsed = UpsertProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const existing = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));

    console.log("existing rows:", existing.length);

    let profile;
    if (existing.length > 0) {
      [profile] = await db
        .update(profilesTable)
        .set({ ...parsed.data, userId, updatedAt: new Date() })
        .where(eq(profilesTable.userId, userId))
        .returning();
    } else {
      const insertData = { ...parsed.data, userId };
      console.log("insertData:", JSON.stringify(insertData));
      [profile] = await db
        .insert(profilesTable)
        .values(insertData)
        .returning();
    }

    res.json(UpsertProfileResponse.parse(profile));
  } catch (err: any) {
    console.error("PUT /profile error:", err?.message, err?.code, err?.detail, err?.stack);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

export default router;
