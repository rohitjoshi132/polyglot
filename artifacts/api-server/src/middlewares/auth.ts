import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import type { Request, Response, NextFunction } from "express";

// ── Firebase Admin Initialization ──────────────────────────────────────────
// Firebase Admin can verify ID tokens using Google's public keys.
// A full service account is NOT required for token verification —
// only the project ID is needed. The private key is only required for
// creating custom tokens or accessing other Firebase services.
if (!getApps().length) {
  const serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];

  if (serviceAccountJson) {
    try {
      const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
      initializeApp({ credential: cert(sa) });
      console.log("✅ Firebase Admin: initialized with service account");
    } catch (err) {
      console.warn("⚠️  Firebase Admin: failed to parse service account JSON, falling back to project ID");
      console.warn(err);
      initializeApp({ projectId: "polyglot-95500" });
    }
  } else {
    // No service account — initialise with project ID only.
    // verifyIdToken() still works because Firebase downloads Google's
    // public keys at runtime to validate JWT signatures.
    console.log("ℹ️  Firebase Admin: no service account set, initializing with project ID (token verification still works)");
    initializeApp({ projectId: "polyglot-95500" });
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
/**
 * Middleware that requires a valid Firebase ID token.
 * Rejects unauthenticated / invalid requests with 401.
 */
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
    const decoded = await getAuth().verifyIdToken(token, /* checkRevoked */ true);
    req.firebaseUser = decoded;
    next();
  } catch (err: unknown) {
    // Surface the real Firebase error code for easier debugging
    const code = (err as { code?: string })?.code ?? "unknown";
    console.error("Token verification failed:", code, (err as Error)?.message);

    if (code === "auth/id-token-expired") {
      res.status(401).json({ error: "Token expired — please sign in again" });
    } else {
      res.status(401).json({ error: "Invalid or expired token", code });
    }
  }
}

// ── optionalAuth ─────────────────────────────────────────────────────────────
/**
 * Middleware that optionally attaches user info if a valid token is present.
 * Does NOT reject unauthenticated requests.
 */
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
        // Invalid token — proceed without user
      }
    }
  }

  next();
}
