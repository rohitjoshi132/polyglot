import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  auth,
  signInWithGoogle as fbGoogleSignIn,
  signInWithEmail as fbEmailSignIn,
  signUpWithEmail as fbEmailSignUp,
  signOut as fbSignOut,
  type FirebaseUser,
} from "@/lib/firebase";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user to backend after sign-in
  const syncUser = async (firebaseUser: FirebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const apiBase = import.meta.env.VITE_API_URL || "";
      await fetch(`${apiBase}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.warn("Failed to sync user to backend:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Set auth token getter for API client
        setAuthTokenGetter(async () => {
          return await firebaseUser.getIdToken();
        });
        // Sync user to backend
        await syncUser(firebaseUser);
      } else {
        setAuthTokenGetter(null as unknown as () => Promise<string>);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const firebaseUser = await fbGoogleSignIn();
    setUser(firebaseUser);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const firebaseUser = await fbEmailSignIn(email, password);
    setUser(firebaseUser);
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const firebaseUser = await fbEmailSignUp(email, password, displayName);
    setUser(firebaseUser);
  };

  const signOutUser = async () => {
    await fbSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut: signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
