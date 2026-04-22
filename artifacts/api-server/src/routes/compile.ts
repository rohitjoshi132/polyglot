import { Router, type IRouter } from "express";
import { detectLanguage } from "../lib/detector.js";
import { compileAndRun } from "../lib/compiler.js";
import { db } from "@workspace/db";
import { submissionsTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.post("/compile", async (req, res) => {
  const { code, filename, language: langOverride, args } = req.body as {
    code?: string;
    filename?: string;
    language?: string;
    args?: string[];
  };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required and must be a string" });
    return;
  }

  const detection = detectLanguage(code, filename);
  const language = langOverride || detection.detected;

  const compileResult = await compileAndRun(code, language, args || []);

  // Database logging bypassed for local testing (Option A)
  const inserted = { id: Date.now() };

  res.json({
    submissionId: inserted.id,
    detected: language,
    confidence: detection.confidence,
    confidenceLevel: detection.confidenceLevel,
    stdout: compileResult.stdout,
    stderr: compileResult.stderr,
    exitCode: compileResult.exitCode,
    success: compileResult.success,
    compilationMs: compileResult.compilationMs,
    toolchainAvailable: compileResult.toolchainAvailable,
    installHint: compileResult.installHint,
  });
});

export default router;
