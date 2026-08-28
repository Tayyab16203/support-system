"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  signIn,
  signOut,
  confirmSignIn,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";
import { configureAmplify } from "@/lib/cognito";
import { api } from "@/lib/api";

configureAmplify();

interface AuthUser {
  username: string;
  userId: string;
}

/** The user's profile record from our backend (includes role). */
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  email_notifications: boolean;
}

interface LoginResult {
  /** True when Cognito requires the user to set a new (permanent) password. */
  newPasswordRequired: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeNewPassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Resolve the session once on mount.
    void refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(): Promise<void> {
    try {
      const res = await api.post<{ data: UserProfile }>("/auth/me");
      setProfile(res.data);
    } catch {
      setProfile(null);
    }
  }

  async function refreshUser(): Promise<void> {
    try {
      const current = await getCurrentUser();
      setUser({ username: current.username, userId: current.userId });
      await loadProfile();
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<LoginResult> {
    const result = await signIn({ username: email, password });
    if (
      result.nextStep?.signInStep ===
      "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
    ) {
      return { newPasswordRequired: true };
    }
    await refreshUser();
    return { newPasswordRequired: false };
  }

  async function completeNewPassword(newPassword: string): Promise<void> {
    await confirmSignIn({ challengeResponse: newPassword });
    await refreshUser();
  }

  async function logout(): Promise<void> {
    await signOut();
    setUser(null);
    setProfile(null);
  }

  async function getAccessToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() ?? null;
    } catch {
      return null;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: profile?.role === "admin",
        login,
        completeNewPassword,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
