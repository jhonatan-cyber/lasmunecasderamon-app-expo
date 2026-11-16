import { Platform } from 'react-native';

/**
 * Virtualización común para listas largas.
 * `removeClippedSubviews` se desactiva en web: allí recorta celdas visibles.
 */
export const LIST_PERF_PROPS = {
    initialNumToRender: 8,
    windowSize: 7,
    maxToRenderPerBatch: 8,
    removeClippedSubviews: Platform.OS !== 'web',
} as const;
