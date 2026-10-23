import { useRef, useEffect } from 'react';

/**
 * useRenderCount — Dev-only hook that tracks render count and logs
 * unnecessary re-renders via prop diffs.
 *
 * Adds to global window.__RENDER_COUNTS for aggregate reporting.
 * Only active when __DEV__ is true (production builds tree-shake it).
 *
 * @example
 * ```tsx
 * useRenderCount('ServiceCard', { item: item.id, theme });
 * ```
 *
 * Check aggregate report in console:
 * ```js
 * window.__RENDER_REPORT()
 * ```
 */
export function useRenderCount(
  componentName: string,
  props?: Record<string, any>,
) {
  const renderCount = useRef(0);
  const prevProps = useRef<Record<string, any> | null>(null);
  // ── Diff props to detect unnecessary re-renders ────────────────────
  useEffect(() => {
    if (!__DEV__) return;
    renderCount.current += 1;
    if (typeof window !== 'undefined') {
      const reportWindow = window as any;
      reportWindow.__RENDER_COUNTS ??= {};
      reportWindow.__RENDER_COUNTS[componentName] ??= { count: 0, reasons: [] };
      reportWindow.__RENDER_COUNTS[componentName].count += 1;
      reportWindow.__RENDER_REPORT ??= () => console.table(reportWindow.__RENDER_COUNTS);
    }
    if (!props || renderCount.current <= 1) {
      prevProps.current = props ? { ...props } : null;
      return;
    }

    const changedKeys: string[] = [];
    const prev = prevProps.current || {};

    // Check for changed or added keys
    for (const key of Object.keys(props)) {
      if (props[key] !== prev[key]) {
        changedKeys.push(key);
      }
    }

    // Check for removed keys
    for (const key of Object.keys(prev)) {
      if (!(key in props)) {
        changedKeys.push(`[removed] ${key}`);
      }
    }

    if (changedKeys.length > 0) {
      const msg = `${componentName} re-render #${renderCount.current}: ${changedKeys.join(', ')}`;
      if (changedKeys.length <= 3) {
        console.debug(msg);
      }

      if (typeof window !== 'undefined') {
        const counts = (window as any).__RENDER_COUNTS;
        if (counts?.[componentName]) {
          counts[componentName].reasons.push(msg);
          // Keep only last 20 reasons to avoid memory leaks
          if (counts[componentName].reasons.length > 20) {
            counts[componentName].reasons.shift();
          }
        }
      }
    }

    prevProps.current = { ...props };
  });
}
