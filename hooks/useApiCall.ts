import { useCallback } from 'react';
import { UnauthorizedError } from '../api/client';

export function useApiCall() {
    const apiCall = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
        try {
            return await fn();
        } catch (error: any) {
            if (error instanceof UnauthorizedError) {

                return null;
            }
            throw error;
        }
    }, []);

    return { apiCall };
}
