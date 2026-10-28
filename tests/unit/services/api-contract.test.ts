import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';

/**
 * Test de contrato auto-verificativo: app (services, hooks, componentes y
 * pantallas) ↔ rutas REALES del dashboard.
 *
 *   1. extrae cada endpoint que la app pasa a `apiClientSafe(...)`/`apiClient(...)`,
 *      resolviendo literales, templates y variables locales simples;
 *   2. lee las rutas reales del dashboard (route.ts bajo app/api/);
 *   3. falla si la app llama a un endpoint que no existe, si usa un método HTTP
 *      que la ruta no exporta, o si todavía usa una URL retirada del catálogo
 *      `LEGACY_ROUTE_REDIRECTS` / `LEGACY_API_SEGMENTS`.
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
const LEGACY_FILE = DASHBOARD_ROOT
  ? join(DASHBOARD_ROOT, 'lib', 'constants', 'legacy-routes.ts')
  : null;

/** Directorios de la app que pueden iniciar llamadas HTTP. */
const SOURCE_ROOTS = ['services', 'hooks', 'components', 'app', 'context', 'store'];

interface AppCall {
  path: string;
  method: string;
  file: string;
}

interface Forwarder {
  paramIndex: number;
  method: string;
}

function isApiClient(expression: ts.Expression): boolean {
  return (
    ts.isIdentifier(expression) &&
    (expression.text === 'apiClientSafe' || expression.text === 'apiClient')
  );
}

function templateText(node: ts.TemplateExpression): string {
  let raw = node.head.text;
  for (const span of node.templateSpans) {
    raw += '${' + span.expression.getText() + '}' + span.literal.text;
  }
  return raw;
}

/**
 * Normaliza el literal de un endpoint a una ruta limpia (`/accounts/<dyn>/stop`).
 * El `/api` inicial pertenece al cliente, no al literal.
 */
function normalizeEndpoint(raw: string): string | null {
  const open = (raw.match(/\$\{/g) || []).length;
  const close = (raw.match(/\}/g) || []).length;
  if (open > close) {
    // Template incompleto (backticks anidados): nos quedamos con el prefijo literal.
    raw = raw.split('${')[0];
  } else {
    // `${id}` en posición de segmento → comodín; el resto (query params) → fuera.
    raw = raw.replace(/\$\{[^{}]*\}/g, (_m, off: number) =>
      raw[off - 1] === '/' ? '<dyn>' : ''
    );
  }
  if (raw.includes('${')) raw = raw.split('${')[0];
  raw = raw.split('?')[0];
  raw = raw.replace(/\/+/g, '/').replace(/\/$/, '');
  if (raw === '/api') return null;
  if (raw.startsWith('/api/')) raw = raw.slice(4);
  if (!/^\/[A-Za-z0-9_\-/<>.]+$/.test(raw)) return null;
  if (!/[A-Za-z]/.test(raw)) return null;
  return raw;
}

function methodOf(call: ts.CallExpression): string {
  const options = call.arguments[1];
  if (!options) return 'GET';
  if (!ts.isObjectLiteralExpression(options)) return 'UNKNOWN';

  let method = 'GET';
  for (const property of options.properties) {
    if (ts.isSpreadAssignment(property)) return 'UNKNOWN';
    if (!ts.isPropertyAssignment(property)) continue;
    const name = ts.isIdentifier(property.name)
      ? property.name.text
      : ts.isStringLiteral(property.name)
        ? property.name.text
        : null;
    if (name !== 'method') continue;
    const value = property.initializer;
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
      return value.text.toUpperCase();
    }
    return 'UNKNOWN';
  }
  return method;
}

/** Resuelve literales, condicionales y variables locales simples de un endpoint. */
function endpointLiterals(
  expression: ts.Expression | undefined,
  initializers: Map<string, ts.Expression[]>,
  seen = new Set<string>(),
  depth = 0
): string[] {
  if (!expression || depth > 6) return [];

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return [expression.text];
  }
  if (ts.isTemplateExpression(expression)) return [templateText(expression)];

  if (ts.isConditionalExpression(expression)) {
    return [
      ...endpointLiterals(expression.whenTrue, initializers, seen, depth + 1),
      ...endpointLiterals(expression.whenFalse, initializers, seen, depth + 1),
    ];
  }

  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isNonNullExpression(expression)
  ) {
    return endpointLiterals(expression.expression, initializers, seen, depth + 1);
  }

  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return [
      ...endpointLiterals(expression.left, initializers, seen, depth + 1),
      ...endpointLiterals(expression.right, initializers, seen, depth + 1),
    ];
  }

  if (ts.isIdentifier(expression)) {
    if (seen.has(expression.text)) return [];
    const next = initializers.get(expression.text) ?? [];
    const nestedSeen = new Set(seen).add(expression.text);
    return next.flatMap((init) => endpointLiterals(init, initializers, nestedSeen, depth + 1));
  }

  return [];
}

/** Detecta funciones locales que solo reenvían un parámetro al cliente HTTP. */
function forwardedParam(
  body: ts.ConciseBody | undefined,
  parameters: ts.NodeArray<ts.ParameterDeclaration>
): Forwarder | null {
  if (!body) return null;
  let result: Forwarder | null = null;

  const visit = (node: ts.Node) => {
    if (result) return;
    if (ts.isCallExpression(node) && isApiClient(node.expression)) {
      const endpoint = node.arguments[0];
      if (endpoint && ts.isIdentifier(endpoint)) {
        const index = parameters.findIndex(
          (parameter) =>
            ts.isIdentifier(parameter.name) && parameter.name.text === endpoint.text
        );
        if (index >= 0) {
          result = { paramIndex: index, method: methodOf(node) };
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(body);
  return result;
}

function sourceFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(name)) continue;
      if (/\.(test|spec)\./.test(name) || name.endsWith('.d.ts')) continue;
      files.push(full);
    }
  };

  for (const root of SOURCE_ROOTS) {
    const dir = join(APP_ROOT, root);
    if (existsSync(dir)) walk(dir);
  }
  return files;
}

function extractAppCalls(): AppCall[] {
  const calls: AppCall[] = [];

  for (const file of sourceFiles()) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('apiClientSafe') && !source.includes('apiClient(')) continue;

    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const initializers = new Map<string, ts.Expression[]>();
    const forwarders = new Map<string, Forwarder>();

    const collectDeclarations = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer
      ) {
        const list = initializers.get(node.name.text) ?? [];
        list.push(node.initializer);
        initializers.set(node.name.text, list);

        const fn = ts.isArrowFunction(node.initializer)
          ? node.initializer
          : ts.isFunctionExpression(node.initializer)
            ? node.initializer
            : ts.isCallExpression(node.initializer) &&
                ts.isIdentifier(node.initializer.expression) &&
                ['useCallback', 'useMemo'].includes(node.initializer.expression.text)
              ? node.initializer.arguments[0]
              : null;

        if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) {
          const forwarded = forwardedParam(fn.body, fn.parameters);
          if (forwarded) forwarders.set(node.name.text, forwarded);
        }
      }

      if (ts.isFunctionDeclaration(node) && node.name && node.body) {
        const forwarded = forwardedParam(node.body, node.parameters);
        if (forwarded) forwarders.set(node.name.text, forwarded);
      }

      ts.forEachChild(node, collectDeclarations);
    };
    collectDeclarations(sourceFile);

    const visitCalls = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const name = node.expression.text;
        if (isApiClient(node.expression)) {
          for (const raw of endpointLiterals(node.arguments[0], initializers)) {
            const path = normalizeEndpoint(raw);
            if (path) {
              calls.push({
                path,
                method: methodOf(node),
                file: relative(APP_ROOT, file).split(sep).join('/'),
              });
            }
          }
        } else {
          const forwarder = forwarders.get(name);
          if (forwarder) {
            for (const raw of endpointLiterals(
              node.arguments[forwarder.paramIndex],
              initializers
            )) {
              const path = normalizeEndpoint(raw);
              if (path) {
                calls.push({
                  path,
                  method: forwarder.method,
                  file: relative(APP_ROOT, file).split(sep).join('/'),
                });
              }
            }
          }
        }
      }
      ts.forEachChild(node, visitCalls);
    };
    visitCalls(sourceFile);
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
        const source = readFileSync(full, 'utf8');
        const rel = relative(API_DIR!, full).split(sep).slice(0, -1).join('/');
        const routePath = '/api' + (rel ? '/' + rel : '');
        const methods = [
          ...source.matchAll(
            /export\s+(?:const|async function|function)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b/g
          ),
        ].map((match) => match[1]);
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
    .map((segment) => {
      if (segment.startsWith('[...')) return '<REST>';
      if (segment.startsWith('[[')) return '<REST0>';
      if (segment.startsWith('[')) return '<PARAM>';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
  const re = parts
    .join('/')
    .replace(/<REST>/g, '[^/]+')
    .replace(/<REST0>/g, '(?:[^/]+)?')
    .replace(/<PARAM>/g, '[^/]+');
  return new RegExp('^/' + re + '$');
}

// ── Catálogo de URLs retiradas del dashboard ──────────────────────────────────
interface LegacyTables {
  routes: Map<string, string>;
  groups: Map<string, { nuevo: string; segmentos: Map<string, string> }>;
}

function readLegacyTables(): LegacyTables | null {
  if (!LEGACY_FILE || !existsSync(LEGACY_FILE)) return null;
  const source = readFileSync(LEGACY_FILE, 'utf8');

  const routesBlock =
    /export const LEGACY_ROUTE_REDIRECTS[^{]*\{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
  const routes = new Map<string, string>();
  for (const match of routesBlock.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    routes.set(match[1], match[2]);
  }

  const apiBlock =
    /export const LEGACY_API_SEGMENTS[^{]*\{([\s\S]*?)\n\};/.exec(source)?.[1] ?? '';
  const groups = new Map<string, { nuevo: string; segmentos: Map<string, string> }>();
  const groupPattern =
    /(?:^|\n)\s*'?([A-Za-z0-9_-]+)'?:\s*\{\s*nuevo:\s*'([^']+)',\s*segmentos:\s*\{([\s\S]*?)\}\s*\},?/g;
  for (const group of apiBlock.matchAll(groupPattern)) {
    const segmentos = new Map<string, string>();
    for (const segment of group[3].matchAll(/'?([A-Za-z0-9_-]+)'?:\s*'([^']+)'/g)) {
      segmentos.set(segment[1], segment[2]);
    }
    groups.set(group[1], { nuevo: group[2], segmentos });
  }

  return routes.size && groups.size ? { routes, groups } : null;
}

const LEGACY = readLegacyTables();
const LEGACY_ROUTE_KEYS = LEGACY
  ? [...LEGACY.routes.keys()].sort((a, b) => b.length - a.length)
  : [];

/** Equivalente a `legacyRedirectTarget` del dashboard, sin importar su módulo. */
function retiredTarget(pathname: string): string | null {
  if (!LEGACY) return null;

  let current = pathname;
  for (let step = 0; step < 4; step++) {
    let next: string | null = null;

    for (const origin of LEGACY_ROUTE_KEYS) {
      if (current === origin) {
        next = LEGACY.routes.get(origin)!;
        break;
      }
      if (current.startsWith(origin + '/')) {
        next = LEGACY.routes.get(origin)! + current.slice(origin.length);
        break;
      }
    }

    if (!next && current.startsWith('/api/')) {
      const segments = current.slice('/api/'.length).split('/');
      const group = LEGACY.groups.get(segments[0]);
      if (group) {
        let changed = false;
        if (group.nuevo !== segments[0]) {
          segments[0] = group.nuevo;
          changed = true;
        }
        for (let i = 1; i < segments.length; i++) {
          const translated = group.segmentos.get(segments[i]);
          if (translated && translated !== segments[i]) {
            segments[i] = translated;
            changed = true;
          }
        }
        if (changed) next = '/api/' + segments.join('/');
      }
    }

    if (!next || next === current) break;
    current = next;
  }

  return current === pathname ? null : current;
}

const apiPath = (path: string) => '/api' + path;

describe('API contract: app ↔ rutas reales del dashboard', () => {
  const appCalls = extractAppCalls();
  const dashRoutes = API_DIR ? readDashboardRoutes() : [];
  const patterns = dashRoutes.map((route) => ({ ...route, re: routeToRegex(route.path) }));
  const uniqueCalls = [...new Map(appCalls.map((call) => [call.path + '|' + call.file, call])).values()];

  it.skipIf(!API_DIR)('el walker encontró rutas y llamadas en todos los niveles (no falló en silencio)', () => {
    expect(
      API_DIR,
      `No se encontró el repo del dashboard como hermano de la app. ` +
        `Busqué en: ${CANDIDATES.join(' | ')}`
    ).toBeTruthy();
    expect(
      dashRoutes.length,
      'dashboard: se esperaban >100 rutas app/api/**/route.ts'
    ).toBeGreaterThan(100);
    expect(
      uniqueCalls.length,
      'app: se esperaban >40 endpoints distintos en services/hooks/components/app'
    ).toBeGreaterThan(40);
    expect(
      uniqueCalls.filter((call) => call.file.startsWith('hooks/')).length,
      'app: el walker no encontró llamadas en hooks/'
    ).toBeGreaterThan(0);
    expect(
      uniqueCalls.filter((call) => call.file.startsWith('components/')).length,
      'app: el walker no encontró llamadas en components/'
    ).toBeGreaterThan(0);
    expect(
      uniqueCalls.filter((call) => call.file.startsWith('app/')).length,
      'app: el walker no encontró llamadas en pantallas app/'
    ).toBeGreaterThan(0);
    expect(LEGACY, `No se pudo leer el catálogo legacy en ${LEGACY_FILE}`).not.toBeNull();
    expect(LEGACY!.routes.size, 'dashboard: catálogo de URLs retiradas incompleto').toBeGreaterThan(
      40
    );
    expect(LEGACY!.groups.size, 'dashboard: catálogo de segmentos retirados incompleto').toBeGreaterThan(
      10
    );
  });

  it.skipIf(!LEGACY)('el catálogo de URLs retiradas se resuelve como el del dashboard', () => {
    expect(retiredTarget('/api/cuentas/7')).toBe('/api/accounts/7');
    expect(retiredTarget('/api/accounts/7/cobrar')).toBe('/api/accounts/7/charge');
    expect(retiredTarget('/api/cuentas/7/cobrar-con-venta')).toBe(
      '/api/accounts/7/charge-with-sale'
    );
    expect(retiredTarget('/api/attendance/hoy')).toBe('/api/attendance/today');
    expect(retiredTarget('/api/accounts/7')).toBeNull();
  });

  it.skipIf(!API_DIR)('cada endpoint llamado por la app existe en el dashboard', () => {
    const faltantes = uniqueCalls
      .filter((call) => !patterns.some((pattern) => pattern.re.test(apiPath(call.path))))
      // Las URLs retiradas tienen su propio test, con el destino recomendado.
      .filter((call) => retiredTarget(apiPath(call.path)) === null)
      .map((call) => `${call.path} (${call.file})`);
    expect(
      faltantes,
      `Endpoints de la app sin ruta en el dashboard: ${faltantes.join(', ')}`
    ).toEqual([]);
  });

  it.skipIf(!API_DIR)('el método HTTP que la app envía existe en la ruta del dashboard', () => {
    const errores: string[] = [];
    for (const call of uniqueCalls) {
      if (call.method === 'UNKNOWN') continue; // method dinámico: no verificable
      const hits = patterns.filter((pattern) => pattern.re.test(apiPath(call.path)));
      if (!hits.length) continue; // lo cubre el test anterior
      if (!hits.some((hit) => hit.methods.includes(call.method))) {
        errores.push(
          `${call.method} ${apiPath(call.path)} (${call.file}) — la ruta existe solo con: ` +
            hits.map((hit) => `${hit.methods.join('/') || 'sin export'} (${hit.path})`).join(', ')
        );
      }
    }
    expect([...new Set(errores)], [...new Set(errores)].join(' | ')).toEqual([]);
  });

  it.skipIf(!LEGACY)('ningún hook, componente o pantalla usa una URL retirada', () => {
    const retiradas = uniqueCalls
      .map((call) => ({ call, target: retiredTarget(apiPath(call.path)) }))
      .filter((entry): entry is { call: AppCall; target: string } => entry.target !== null)
      .map(
        ({ call, target }) =>
          `${apiPath(call.path)} (${call.file}) → usar ${target}`
      );

    expect(
      retiradas,
      `La app todavía llama URLs retiradas: ${retiradas.join(' | ')}`
    ).toEqual([]);
  });
});
