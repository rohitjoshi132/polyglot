import { Router, type IRouter } from "express";
import { detectLanguage } from "../lib/detector.js";

const router: IRouter = Router();

router.post("/detect", (req, res) => {
  const { code, filename } = req.body as { code?: string; filename?: string };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required and must be a string" });
    return;
  }

  const result = detectLanguage(code, filename);
  res.json(result);
});

export default router;
