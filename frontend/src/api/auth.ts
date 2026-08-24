import { apiFetch, setTokens, clearTokens } from "./client";

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export async function signup(email: string, password: string, displayName?: string) {
  const tokens = await apiFetch<TokenPair>("/auth/signup", {
    method: "POST",
    body: { email, password, display_name: displayName },
  });
  setTokens(tokens.access_token, tokens.refresh_token);
}

export async function login(email: string, password: string) {
  const tokens = await apiFetch<TokenPair>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  setTokens(tokens.access_token, tokens.refresh_token);
}

export function logout() {
  clearTokens();
}
