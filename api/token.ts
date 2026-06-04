import { TokenStorage } from "@/utils/tokenStorage";

let tokenInMemory: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setTokenInMemory(token: string | null) {
  tokenInMemory = token;
}

export function getTokenInMemory(): string | null {
  return tokenInMemory;
}

export async function ensureTokenInMemory(): Promise<string | null> {
  if (!tokenInMemory) {
    tokenInMemory = await TokenStorage.getToken();
  }

  return tokenInMemory;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function notifyUnauthorized() {
  onUnauthorized?.();
}
