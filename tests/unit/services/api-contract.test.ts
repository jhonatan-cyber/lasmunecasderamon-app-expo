import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Test de contrato auto-verificativo: app services ↔ rutas REALES del dashboard.
 *
 * A diferencia del test anterior (que mockeaba apiClientSafe y se auto-verificaba),
 * este:
 *   1. extrae cada endpoint que llama `services/*.ts` vía `apiClientSafe(...)`,
 *   2. lee las rutas reales del dashboard (route.ts bajo app/api/),
 *   3. falla si la app llama a un endpoint que no existe (o si falta el método HTTP).
 *
 * Requiere el repo del dashboard como hermano de la app.
 */

const APP_ROOT = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
const CANDIDATES = [
  join(APP_ROOT, '..', 'lasmunecasderamon-dashboard'),
  join(process.cwd(), '..', 'lasmunecasderamon-dashboard'),
  join(process.cwd(), 'lasmunecasderamon-dashboard'),
];
const DASHBOARD_ROOT = CANDIDATES.find((c) => existsSync(join(c, 'app', 'api')));
const API_DIR = DASHBOARD_ROOT ? join(DASHBOARD_ROOT, 'app', 'api') : null;

// ── Parsing de llamadas: string literals / template literals con interpolación ──
function skipString(src: string, i: number): number {
  const q = src[i];
  i++;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === q) return i + 1;
    i++;
  }
  return i;
}

function skipInterp(src: string, i: number): number {
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"') { i = skipString(src, i); continue; }
    if (c === '`') { i = skipTemplate(src, i); continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  return i;
}

function skipTemplate(src: string, i: number): number {
  i++;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '$' && src[i + 1] === '{') { i = skipInterp(src, i + 1); continue; }
    if (c === '`') return i + 1;
    i++;
  }
  return i;
}

function skipCall(src: string, i: number): number {
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"') { i = skipString(src, i); continue; }
    if (c === '`') { i = skipTemplate(src, i); continue; }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  return i;
}

/** Normaliza el literal de un endpoint a una ruta limpia (`/cuentas/<dyn>/stop`). */
function normalizeEndpoint(raw: string): string | null {
  const open = (raw.match(/\$\{/g) || []).length;
  const close = (raw.match(/\}/g) || []).length;
  if (open > close) {
    // Template incompleto (backticks anidados): nos quedamos con el prefijo literal.
    raw = raw.split('${')[0];
  } else {
    // `${id}` en posición de segmento → comodín; el resto (query params) → fuera.
    raw = raw.replace(/\$\{[^{}]*\}/g, (_m, off: number) => (raw[off - 1] === '/' ? '<dyn>' : ''));
  }
  if (raw.includes('${')) raw = raw.split('${')[0];
  raw = raw.split('?')[0];
  raw = raw.replace(/\/+/g, '/').replace(/\/$/, '');
  if (!/^\/[A-Za-z0-9_\-\/<>.]+$/.test(raw)) return null;
  if (!/[A-Za-z]/.test(raw)) return null;
  return raw;
}

interface AppCall {
  path: string;
  method: string;
  file: string;
}

function extractAppCalls(): AppCall[] {
  const servicesDir = join(APP_ROOT, 'services');
  const calls: AppCall[] = [];
  const fn = 'apiClientSafe(';
  for (const file of readdirSync(servicesDir).filter((n) => n.endsWith('.ts'))) {
    const src = readFileSync(join(servicesDir, file), 'utf8');
    let idx = 0;
    while ((idx = src.indexOf(fn, idx)) !== -1) {
      const paren = idx + fn.length - 1;
      let i = paren + 1;
      while (i < src.length && /\s/.test(src[i])) i++;
      const q = src[i];
      let end: number;
      if (q === "'" || q === '"') end = skipString(src, i);
      else if (q === '`') end = skipTemplate(src, i);
      else { idx = i + 1; continue; }
      const raw = src.slice(i + 1, end - 1);
      const rest = src.slice(end, skipCall(src, paren));
      const m = /method:\s*['"](\w+)['"]/.exec(rest);
      const method = m ? m[1] : /method:\s*[A-Za-z_$]/.test(rest) ? 'UNKNOWN' : 'GET';
      const path = normalizeEndpoint(raw);
      if (path) calls.push({ path, method, file });
      idx = end;
    }
  }
  return calls;
}

// ── Rutas reales del dashboard ────────────────────────────────────────────────
interface DashRoute {
  path: string;
  methods: string[];
}

function readDashboardRoutes(): DashRoute[] {
  const routes: DashRoute[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === 'route.ts') {
        const src = readFileSync(full, 'utf8');
        const rel = relative(API_DIR!, full).split(sep).slice(0, -1).join('/');
        const routePath = '/api' + (rel ? '/' + rel : '');
        const methods = [
          ...src.matchAll(
            /export\s+(?:const|async function|function)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b/g
          ),
        ].map((x) => x[1]);
        routes.push({ path: routePath, methods });
      }
    }
  };
  walk(API_DIR!);
  return routes;
}

function routeToRegex(routePath: string): RegExp {
  const parts = routePath
    .split('/')
    .filter(Boolean)
    .map((s) => {
      if (s.startsWith('[...')) return '<REST>';
      if (s.startsWith('[[')) return '<REST0>';
      if (s.startsWith('[')) return '<PARAM>';
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
  const re = parts
    .join('/')
    .replace(/<REST>/g, '[^/]+')
    .replace(/<REST0>/g, '(?:[^/]+)?')
    .replace(/<PARAM>/g, '[^/]+');
  return new RegExp('^/' + re + '$');
}

describe('API contract: services/*.ts de la app ↔ rutas reales del dashboard', () => {
  const appCalls = extractAppCalls();
  const dashRoutes = API_DIR ? readDashboardRoutes() : [];
  const patterns = dashRoutes.map((r) => ({ ...r, re: routeToRegex(r.path) }));

  it('el walker encontró rutas en ambos lados (no falló en silencio)', () => {
    expect(
      API_DIR,
      `No se encontró el repo del dashboard como hermano de la app. ` +
        `Busqué en: ${CANDIDATES.join(' | ')}`
    ).toBeTruthy();
    expect(dashRoutes.length, 'dashboard: se esperaban >100 rutas app/api/**/route.ts').toBeGreaterThan(100);
    expect(appCalls.length, 'app: se esperaban >40 llamadas apiClientSafe en services/').toBeGreaterThan(40);
  });

  it('cada endpoint llamado por la app existe en el dashboard', () => {
    const faltantes = appCalls
      .filter((c) => !patterns.some((p) => p.re.test('/api' + c.path)))
      .map((c) => `${c.path} (${c.file})`);
    expect(
      [...new Set(faltantes)],
      `Endpoints de la app sin ruta en el dashboard: ${[...new Set(faltantes)].join(', ')}`
    ).toEqual([]);
  });

  it('el método HTTP que la app envía existe en la ruta del dashboard', () => {
    const errores: string[] = [];
    for (const call of appCalls) {
      if (call.method === 'UNKNOWN') continue; // method dinámico: no verificable
      const hits = patterns.filter((p) => p.re.test('/api' + call.path));
      if (!hits.length) continue; // lo cubre el test anterior
      if (!hits.some((h) => h.methods.includes(call.method))) {
        errores.push(
          `${call.method} /api${call.path} (${call.file}) — la ruta existe solo con: ` +
            hits.map((h) => `${h.methods.join('/') || 'sin export'} (${h.path})`).join(', ')
        );
      }
    }
    expect([...new Set(errores)], [...new Set(errores)].join(' | ')).toEqual([]);
  });
});
