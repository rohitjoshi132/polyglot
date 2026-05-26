import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import type { Request, Response, NextFunction } from "express";

// Initialize Firebase Admin SDK
const serviceAccountJson = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];

if (serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
    initializeApp({ credential: cert(serviceAccount) });
  } catch {
    console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON, auth will be unavailable");
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set, auth will be unavailable");
}

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
    }
  }
}

/**
 * Middleware that requires a valid Firebase ID token.
 * Rejects unauthenticated requests with 401.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) {
    res.status(401).json({ error: "Invalid token format" });
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.firebaseUser = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware that optionally attaches user info if a valid token is present.
 * Does NOT reject unauthenticated requests.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    if (token) {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        req.firebaseUser = decoded;
      } catch {
        // Token invalid, proceed without user
      }
    }
  }

  next();
}
