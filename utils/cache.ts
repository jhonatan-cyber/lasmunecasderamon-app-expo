import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheItem<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

class AppCache {
    private prefix: string;
    private defaultTTL: number;

    constructor(prefix = 'app-cache', defaultTTL = 5 * 60 * 1000) {
        this.prefix = prefix;
        this.defaultTTL = defaultTTL;
    }

    private getKey(key: string): string {
        return `${this.prefix}:${key}`;
    }

    async set<T>(key: string, data: T, ttl?: number): Promise<void> {
        const now = Date.now();
        const item: CacheItem<T> = {
            data,
            timestamp: now,
            expiresAt: now + (ttl || this.defaultTTL),
        };

        try {
            await AsyncStorage.setItem(this.getKey(key), JSON.stringify(item));
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const jsonValue = await AsyncStorage.getItem(this.getKey(key));
            if (!jsonValue) return null;

            const item: CacheItem<T> = JSON.parse(jsonValue);
            
            if (Date.now() > item.expiresAt) {
                await this.remove(key);
                return null;
            }

            return item.data;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async remove(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(this.getKey(key));
        } catch (error) {
            console.error('Cache remove error:', error);
        }
    }

    async clear(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(k => k.startsWith(this.prefix));
            await AsyncStorage.multiRemove(cacheKeys);
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const data = await fetcher();
        await this.set(key, data, ttl);
        return data;
    }

    async keys(): Promise<string[]> {
        const allKeys = await AsyncStorage.getAllKeys();
        return allKeys
            .filter(k => k.startsWith(this.prefix))
            .map(k => k.replace(this.prefix, ''));
    }

    async size(): Promise<number> {
        const keys = await this.keys();
        return keys.length;
    }
}

export const cache = new AppCache();

export const createQueryCache = <T>(
    queryKey: string[], 
    ttl?: number
) => {
    const key = queryKey.join(':');
    return {
        get: () => cache.get<T>(key),
        set: (data: T) => cache.set(key, data, ttl),
        remove: () => cache.remove(key),
    };
};