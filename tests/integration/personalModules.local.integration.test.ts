import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// This suite only sends GET/OPTIONS requests. It never creates financial records.
// Prefiere el override local (.env.development.local) y cae al .env del proyecto
// si aquel no existe; la garantía anti-producción es la validación de hostname.
const envFile = [".env.development.local", ".env"]
  .map((file) => resolve(process.cwd(), file))
  .find((file) => existsSync(file));
if (!envFile)
  throw new Error(
    "No se encontró .env.development.local ni .env en el proyecto.",
  );
const localEnv = readFileSync(envFile, "utf8");
const configured = localEnv
  .match(/^EXPO_PUBLIC_API_BASE_URL=(.+)$/m)?.[1]
  ?.trim();
if (!configured)
  throw new Error(
    "Configura la API local de Expo antes de ejecutar esta prueba.",
  );
const base = new URL(configured);
if (
  base.protocol !== "http:" ||
  !/^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(
    base.hostname,
  )
)
  throw new Error(
    "La prueba solo acepta la API local; no apunta a producción.",
  );
const origin = "http://localhost:8081";
const endpoints = [
  "/auth/me",
  "/attendance/user?tipo=detalle",
  "/advances/user",
  "/advances/requests",
  "/advances/max",
  "/tips/user?tipo=detalle",
  "/overtime/user",
  "/commissions/user?tipo=detalle",
  "/services/user",
  "/events/user",
  "/gratifications/me",
];
describe("API local real · conexión, CORS y autenticación de módulos personales", () => {
  it("consulta la existencia de usuarios desde el servidor y su base real", async () => {
    const res = await fetch(new URL("/api/auth/check-users", base), {
      signal: AbortSignal.timeout(30000),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.hasUsers).toBe("boolean");
  });
  it.each(endpoints)(
    "protege %s y permite el origen de Expo",
    async (endpoint) => {
      const res = await fetch(new URL("/api" + endpoint, base), {
        headers: { Origin: origin },
        signal: AbortSignal.timeout(30000),
      });
      expect(res.status).toBe(401);
      expect(res.headers.get("access-control-allow-origin")).toBe(origin);
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
      expect((await res.json()).success).toBe(false);
    },
  );
  it("acepta el preflight del login de Expo sin ejecutar un login", async () => {
    const res = await fetch(new URL("/api/auth/login", base), {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
      },
      signal: AbortSignal.timeout(30000),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(origin);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(
      res.headers.get("access-control-allow-headers")?.toLowerCase(),
    ).toContain("authorization");
  });
});
