import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { dashboardService } from '@/services/dashboard';
import {
  mapAnalyticsSummary,
  mapWeekBars,
  mapWeekDistribution,
  mapWeekTotals,
  type AnalyticsBar,
  type AnalyticsPoint,
  type AnalyticsStat,
  type AnalyticsTotals,
} from '@/utils/analytics';
import logger from '@/utils/logger';

const EMPTY_TOTALS: AnalyticsTotals = {
  totalVentas: 0,
  promedioDiario: 0,
  startDate: '',
  endDate: '',
};

/**
 * Datos de la pantalla de Analíticas: `GET /stats/dashboard-summary` (KPI del
 * usuario) + `GET /stats/sales-by-week` (barras y distribución), igual que la
 * `AnalyticsScreen` de Flutter. Se recarga al enfocar la pantalla, como el
 * resto de pantallas apiladas del repo.
 */
export function useAnalyticsScreen() {
  const [stats, setStats] = useState<AnalyticsStat[]>([]);
  const [bars, setBars] = useState<AnalyticsBar[]>([]);
  const [distribution, setDistribution] = useState<AnalyticsPoint[]>([]);
  const [totals, setTotals] = useState<AnalyticsTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);

  const fetchData = useCallback(async (isManual = false, signal?: AbortSignal) => {
    try {
      setError('');
      const [summaryRes, weekRes] = await Promise.all([
        dashboardService.summary(signal),
        dashboardService.salesChart(signal),
      ]);
      if (signal?.aborted) return;

      if (summaryRes?.success) {
        setStats(mapAnalyticsSummary(summaryRes.data));
      } else if (!isManual && !loadedRef.current) {
        setError(summaryRes?.error || 'No se pudo cargar el resumen');
      }

      if (weekRes?.success) {
        const week = weekRes.data;
        setBars(mapWeekBars(week));
        setDistribution(mapWeekDistribution(week));
        setTotals(mapWeekTotals(week));
      } else if (!isManual && !loadedRef.current) {
        setError(weekRes?.error || 'No se pudieron cargar las ventas semanales');
      }

      loadedRef.current = true;
    } catch (e: any) {
      if (signal?.aborted) return;
      logger.fetchError?.(e, { context: 'useAnalyticsScreen:fetchData' });
      if (!loadedRef.current) setError(e?.message || 'Error al cargar las analíticas');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void fetchData(false, controller.signal);
      return () => controller.abort();
    }, [fetchData]),
  );

  const onRefresh = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    void fetchData(true);
  }, [fetchData]);

  return { stats, bars, distribution, totals, loading, refreshing, error, onRefresh };
}
