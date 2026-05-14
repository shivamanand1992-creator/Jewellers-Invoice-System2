import { Router, type IRouter } from "express";
import { requireAuth } from "@clerk/express";

const router: IRouter = Router();

router.get("/auth/me", requireAuth(), async (req, res): Promise<void> => {
  res.json({ userId: req.auth.userId });
});

export default router;
