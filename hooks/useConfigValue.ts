import { useEffect, useState } from 'react';
import { apiClientSafe } from '@/api/client';

const configCache: Record<string, string | number | boolean> = {};
let cacheLoaded = false;

async function ensureConfigs() {
  if (cacheLoaded) return;
  try {
    const res = await apiClientSafe<Record<string, Record<string, string | number | boolean>>>(
      '/configurations'
    );
    if (res && res.success && res.data) {
      for (const category of Object.keys(res.data)) {
        for (const key of Object.keys(res.data[category])) {
          configCache[`${category}.${key}`] = res.data[category][key];
        }
      }
      cacheLoaded = true;
    }
  } catch {
    // keep defaults
  }
}

export function useConfigValue<T = string>(category: string, key: string, defaultValue: T): T {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const cacheKey = `${category}.${key}`;
    if (configCache[cacheKey] !== undefined) {
      setValue(configCache[cacheKey] as T);
      return;
    }
    ensureConfigs().then(() => {
      if (configCache[cacheKey] !== undefined) {
        setValue(configCache[cacheKey] as T);
      }
    });
  }, [category, key, defaultValue]);

  return value;
}
