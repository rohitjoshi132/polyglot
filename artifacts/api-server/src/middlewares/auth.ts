/**
 * Firebase token verification via Google Identity Toolkit REST API.
 *
 * This approach works on ANY server without a service account or credentials.
 * The Web API key is already public (it's in the frontend JavaScript bundle).
 *
 * POST https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=<WEB_API_KEY>
 * → returns the Firebase user corresponding to the ID token.
 */
import type { Request, Response, NextFunction } from "express";

const FIREBASE_WEB_API_KEY = "AIzaSyC3gw0bg2Vc6iEmPsP-HIMHZUE-QjfVe08";

interface FirebaseUser {
  uid: string;
  email: string;
  name?: string;       // displayName from Identity Toolkit
  picture?: string;    // photoUrl from Identity Toolkit
  emailVerified?: boolean;
}

// Extend Express Request to carry Firebase user info
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: FirebaseUser;
    }
  }
}

/** Call Google Identity Toolkit to verify a Firebase ID token. */
async function verifyFirebaseToken(idToken: string): Promise<FirebaseUser> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? "Token verification failed");
  }

  const data = await res.json() as { users?: Array<{ localId: string; email: string; displayName?: string; photoUrl?: string; emailVerified?: boolean }> };
  const user = data.users?.[0];
  if (!user) throw new Error("User not found");

  return {
    uid: user.localId,
    email: user.email,
    name: user.displayName,       // matches routes: req.firebaseUser.name
    picture: user.photoUrl,       // matches routes: req.firebaseUser.picture
    emailVerified: user.emailVerified,
  };
}

// ── requireAuth ───────────────────────────────────────────────────────────────
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
    req.firebaseUser = await verifyFirebaseToken(token);
    next();
  } catch (err) {
    console.error("[auth] Token verification failed:", (err as Error).message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── optionalAuth ──────────────────────────────────────────────────────────────
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
        req.firebaseUser = await verifyFirebaseToken(token);
      } catch {
        // invalid token — proceed without user
      }
    }
  }
  next();
}
