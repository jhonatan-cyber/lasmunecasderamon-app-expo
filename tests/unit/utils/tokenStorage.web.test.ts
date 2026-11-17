import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TokenStorage } from "@/utils/tokenStorage";

// El setup global mockea TokenStorage; acá se prueba el módulo real.
vi.unmock("@/utils/tokenStorage");

describe("TokenStorage en web", () => {
  beforeEach(() => {
    (Platform as unknown as { OS: string }).OS = "web";
  });

  afterEach(() => {
    (Platform as unknown as { OS: string }).OS = "ios";
    vi.clearAllMocks();
  });

  it("guarda y lee los tokens con AsyncStorage porque SecureStore no existe en web", async () => {
    await TokenStorage.saveToken("jwt-web");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith("token", "jwt-web");
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    await expect(TokenStorage.getToken()).resolves.toBe("jwt-web");
  });

  it("borra los tokens con AsyncStorage en web", async () => {
    await TokenStorage.saveToken("jwt-web");
    await TokenStorage.saveRefreshToken("refresh-web");

    await TokenStorage.removeTokens();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("token");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("refresh_token");
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it("sigue usando SecureStore en el teléfono", async () => {
    (Platform as unknown as { OS: string }).OS = "ios";

    await TokenStorage.saveToken("jwt-nativo");

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("token", "jwt-nativo");
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith("token", "jwt-nativo");
  });
});