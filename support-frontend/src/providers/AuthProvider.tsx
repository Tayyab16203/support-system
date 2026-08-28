"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import {
  clearTokens,
  getAccessToken,
  storeTokens,
  type AuthTokens,
} from "@/lib/authTokens";

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
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeNewPassword: (newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

/** Shape of the backend /auth responses. */
interface LoginResponseData extends Partial<AuthTokens> {
  challenge?: string;
  session?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Holds the pending NEW_PASSWORD_REQUIRED challenge between login() and
  // completeNewPassword() so the caller keeps the same simple interface.
  const pendingChallenge = useRef<{ email: string; session: string } | null>(
    null
  );

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(): Promise<void> {
    // No token means no session — skip the profile call entirely.
    if (!getAccessToken()) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.post<{ data: UserProfile }>("/auth/me");
      setProfile(res.data);
    } catch {
      // Token invalid/expired — treat as logged out.
      clearTokens();
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<LoginResult> {
    const res = await api.post<{ data: LoginResponseData }>("/auth/login", {
      email,
      password,
    });
    const data = res.data;

    if (data.challenge === "NEW_PASSWORD_REQUIRED" && data.session) {
      pendingChallenge.current = { email, session: data.session };
      return { newPasswordRequired: true };
    }

    if (data.access_token && data.id_token) {
      storeTokens({
        access_token: data.access_token,
        id_token: data.id_token,
        refresh_token: data.refresh_token,
      });
      await loadProfile();
    }
    return { newPasswordRequired: false };
  }

  async function completeNewPassword(newPassword: string): Promise<void> {
    const challenge = pendingChallenge.current;
    if (!challenge) {
      throw new Error("No pending password challenge. Please log in again.");
    }
    const res = await api.post<{ data: AuthTokens }>("/auth/new-password", {
      email: challenge.email,
      new_password: newPassword,
      session: challenge.session,
    });
    storeTokens(res.data);
    pendingChallenge.current = null;
    await loadProfile();
  }

  async function forgotPassword(email: string): Promise<void> {
    // Backend always responds success (avoids leaking which emails exist).
    await api.post("/auth/forgot-password", { email });
  }

  async function confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    await api.post("/auth/confirm-forgot-password", {
      email,
      code,
      new_password: newPassword,
    });
  }

  async function logout(): Promise<void> {
    const token = getAccessToken();
    if (token) {
      // Best-effort server-side revocation; ignore failures.
      try {
        await api.post("/auth/logout", { access_token: token });
      } catch {
        // ignore
      }
    }
    clearTokens();
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        profile,
        isLoading,
        isAuthenticated: !!profile,
        isAdmin: profile?.role === "admin",
        login,
        completeNewPassword,
        forgotPassword,
        confirmForgotPassword,
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
