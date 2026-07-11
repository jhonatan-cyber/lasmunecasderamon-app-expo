/**
 * babel-plugin-strip-dev-only
 *
 * Strips dev-only code from the production bundle:
 *
 *   1. `useRenderCount(name, props)`          → void 0
 *   2. `import { useRenderCount } from '…'`   → removed specifier / statement
 *   3. `useDebugValue(val)`                    → void 0
 *   4. `console.log(...)` / `console.debug(...)` → void 0
 *
 * Only active when `process.env.NODE_ENV === 'production'`.
 */
module.exports = function stripDevOnly(api) {
  const { types: t } = api;

  // ── Helpers ──────────────────────────────────────────────────────────
  const isProduction = () => process.env.NODE_ENV === 'production';

  /** Replaces a call expression with `void 0`. */
  function toVoid(path) {
    path.replaceWith(t.unaryExpression('void', t.numericLiteral(0)));
  }

  /** True when callee is the bare identifier `useRenderCount`. */
  function isUseRenderCountCall(path) {
    return path.get('callee').isIdentifier({ name: 'useRenderCount' });
  }

  /** True when callee is the bare identifier `useDebugValue`. */
  function isUseDebugValueCall(path) {
    return path.get('callee').isIdentifier({ name: 'useDebugValue' });
  }

  /**
   * True when callee is `console.<method>` where `method` matches one of
   * the provided names.
   */
  function isConsoleCall(path, methods) {
    const callee = path.get('callee');
    if (!callee.isMemberExpression()) return false;
    const obj = callee.get('object');
    const prop = callee.get('property');
    if (!obj.isIdentifier({ name: 'console' })) return false;
    if (!prop.isIdentifier()) return false;
    return methods.includes(prop.node.name);
  }

  /**
   * True for `import { useRenderCount } from '…/useRenderCount'` regardless
   * of the source string (handles `@/hooks/useRenderCount`,
   * `../../hooks/useRenderCount`, etc.).
   */
  function isUseRenderCountImport(path) {
    if (!path.isImportDeclaration()) return false;
    const source = path.node.source.value;
    if (!source.endsWith('useRenderCount') && !source.endsWith('useRenderCount/index')) return false;

    return path.get('specifiers').some(
      (spec) => spec.isImportSpecifier() && spec.node.imported.name === 'useRenderCount',
    );
  }

  // ── Visitor ──────────────────────────────────────────────────────────
  const isProd = isProduction();
  if (!isProd) {
    // In dev mode, do nothing — return empty visitor
    return { visitor: {} };
  }

  return {
    visitor: {
      CallExpression(path) {
        // Strip `useRenderCount(name, props) → void 0`
        if (isUseRenderCountCall(path)) {
          toVoid(path);
          return;
        }

        // Strip `useDebugValue(val) → void 0`
        if (isUseDebugValueCall(path)) {
          toVoid(path);
          return;
        }

        // Strip `console.log(...)` / `console.debug(...) → void 0`
        if (isConsoleCall(path, ['log', 'debug'])) {
          toVoid(path);
          return;
        }
      },

      ImportDeclaration(path) {
        if (!isUseRenderCountImport(path)) return;

        const specifiers = path.get('specifiers');
        const urcSpecifier = specifiers.find(
          (spec) => spec.isImportSpecifier() && spec.node.imported.name === 'useRenderCount',
        );

        if (!urcSpecifier) return;

        if (specifiers.length === 1) {
          // Only `useRenderCount` was imported — remove the whole statement
          path.remove();
        } else {
          // There are other imports from the same module — just remove the specifier
          urcSpecifier.remove();
        }
      },
    },
  };
};
