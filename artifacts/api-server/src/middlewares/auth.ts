import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import type { Request, Response, NextFunction } from "express";

// ── Firebase Admin Initialization ───────────────────────────────────────────
// verifyIdToken() works without a service account — Firebase Admin downloads
// Google's public keys at runtime to validate JWT signatures.
// The private key is only needed for createCustomToken() or checkRevoked.
if (!getApps().length) {
  const raw = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (raw) {
    try {
      initializeApp({ credential: cert(JSON.parse(raw) as ServiceAccount) });
      console.log("Firebase Admin: initialized with service account");
    } catch {
      console.warn("Firebase Admin: bad service account JSON, falling back to projectId");
      initializeApp({ projectId: "polyglot-95500" });
    }
  } else {
    // No service account on Render — project ID is enough for verifyIdToken
    initializeApp({ projectId: "polyglot-95500" });
    console.log("Firebase Admin: initialized with projectId (no service account)");
  }
}

// ── Type augmentation ────────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
    }
  }
}

// ── requireAuth ──────────────────────────────────────────────────────────────
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ error: "Invalid token format" });
    return;
  }

  try {
    // NOTE: do NOT pass checkRevoked:true — that requires service account creds
    const decoded = await getAuth().verifyIdToken(token);
    req.firebaseUser = decoded;
    next();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? "unknown";
    const msg  = (err as Error)?.message ?? "";
    console.error(`[auth] verifyIdToken failed — code: ${code} | msg: ${msg}`);
    res.status(401).json({ error: "Invalid or expired token", code });
  }
}

// ── optionalAuth ─────────────────────────────────────────────────────────────
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token) {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        req.firebaseUser = decoded;
      } catch {
        // invalid token — proceed without user
      }
    }
  }
  next();
}
