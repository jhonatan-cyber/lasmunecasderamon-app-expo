import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { DonutChartProps } from './DonutChart';

const DonutChartComponent = lazy(() =>
  import('./DonutChart').then((mod) => ({ default: mod.DonutChart })),
);

const DonutFallback = ({ size = 140 }: { size?: number }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: 'rgba(148,163,184,0.1)',
    }}
  >
    <ActivityIndicator size="small" color="#94A3B8" />
  </View>
);

export const LazyDonutChart = (props: DonutChartProps) => (
  <Suspense fallback={<DonutFallback size={props.size} />}>
    <DonutChartComponent {...props} />
  </Suspense>
);
