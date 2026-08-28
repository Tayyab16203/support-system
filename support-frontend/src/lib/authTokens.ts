/**
 * Auth token storage helpers.
 *
 * Tokens are issued by the backend (which proxies to Cognito) and persisted
 * in localStorage. The API client reads the access token from here to
 * authorize requests. The frontend never talks to Cognito directly.
 */

const ACCESS_TOKEN_KEY = "accessToken";
const ID_TOKEN_KEY = "idToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export interface AuthTokens {
  access_token: string;
  id_token: string;
  refresh_token?: string | null;
}

export function storeTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(ID_TOKEN_KEY, tokens.id_token);
  if (tokens.refresh_token) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(ID_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
