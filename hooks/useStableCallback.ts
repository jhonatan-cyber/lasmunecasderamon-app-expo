import { useCallback, useRef } from 'react';

/**
 * useStableCallback — Returns a stable callback reference that always executes
 * the latest version of the provided callback without requiring it in dependency arrays.
 *
 * This hook solves the common problem where callbacks need to close over state
 * or props but listing them in deps would invalidate memoized children (React.memo)
 * or cause unnecessary effect re-runs.
 *
 * Under the hood it stores the latest callback in a ref, and the returned
 * stable wrapper always calls `ref.current(...)`.
 *
 * @example
 * ```tsx
 * // BEFORE: large deps array that changes often
 * const handlePress = useCallback(() => {
 *   doSomething(item, state, theme);
 * }, [item, state, theme]);
 *
 * // AFTER: stable forever, always runs latest logic
 * const handlePress = useStableCallback(() => {
 *   doSomething(item, state, theme);
 * });
 * ```
 *
 * @example renderItem with stable onPress
 * ```tsx
 * const onCardPress = useStableCallback((item: Item) => {
 *   setSelected(item);
 *   trackEvent(item.id);
 * });
 *
 * const renderItem = useCallback(({ item }) => (
 *   <MemoizedCard onPress={onCardPress} />
 * ), []); // ⬅️ onCardPress is stable, no deps needed
 * ```
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
): T {
  const ref = useRef(callback);

  // Always keep the ref pointing to the latest callback
  ref.current = callback;

  // Return a stable wrapper that delegates to ref.current
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: any[]) => ref.current(...args), []) as T;
}
