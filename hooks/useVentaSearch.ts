import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClientSafe } from '@/api/client';
import {
  filterForSaleProducts,
  mapForSaleProduct,
} from '@/hooks/utils/cartUtils';
import logger from '@/utils/logger';

export function useVentaSearch() {
  const [searchProducto, setSearchProducto] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortController = useRef<AbortController | null>(null);
  const searchSeq = useRef(0);

  const setSearchProductoInput = useCallback((value: string) => {
    searchAbortController.current?.abort();
    searchAbortController.current = null;
    setSearchProducto(value);
    if (value.trim()) {
      setSearchLoading(true);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = null;
    searchSeq.current++;
    setSearchResults([]);
    setSearchLoading(false);
  }, []);

  const executeSearch = useCallback(async (term: string, seq: number) => {
    searchAbortController.current?.abort();
    const controller = new AbortController();
    searchAbortController.current = controller;
    try {
      const res = await apiClientSafe(
        `/products?for_sale=1&term=${encodeURIComponent(term)}`,
        { signal: controller.signal },
      );
      if (seq !== searchSeq.current) return;
      if ((res as any)?.success && Array.isArray((res as any).data)) {
        setSearchResults(
          filterForSaleProducts((res as any).data).map(mapForSaleProduct),
        );
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      logger.fetchError(error, { context: 'NuevaVenta:searchProducts' });
    } finally {
      if (!controller.signal.aborted && seq === searchSeq.current) {
        if (searchAbortController.current === controller) {
          searchAbortController.current = null;
        }
        setSearchLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const term = searchProducto.trim();
    const seq = ++searchSeq.current;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = null;
    if (!term) return;
    searchTimeout.current = setTimeout(() => {
      searchTimeout.current = null;
      void executeSearch(term, seq);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchProducto, executeSearch]);

  useEffect(
    () => () => {
      searchSeq.current++;
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchAbortController.current?.abort();
    },
    [],
  );

  const handleSearchNow = useCallback(() => {
    const term = searchProducto.trim();
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = null;
    const seq = ++searchSeq.current;
    if (!term) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    void executeSearch(term, seq);
  }, [searchProducto, executeSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchProductoInput('');
  }, [setSearchProductoInput]);

  return {
    searchProducto,
    setSearchProducto: setSearchProductoInput,
    searchResults,
    searchLoading,
    handleSearchNow,
    handleClearSearch,
  };
}
