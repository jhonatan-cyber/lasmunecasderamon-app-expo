import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import EventSource from 'react-native-sse';

export type SSEEventType = 
    | 'notification'
    | 'service_update'
    | 'sale_update'
    | 'attendance_update'
    | 'cash_register_update'
    | 'message';

export interface SSEEvent {
    type: SSEEventType;
    data: any;
    timestamp: number;
}

interface UseSSEReturn {
    isConnected: boolean;
    lastEvent: SSEEvent | null;
    reconnect: () => void;
    disconnect: () => void;
}

export const useSSE = (enabled: boolean = true): UseSSEReturn => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
    const eventSourceRef = useRef<EventSource<any> | null>(null);
    const reconnectTimeoutRef = useRef<any>(null);
    const token = useAuthStore((state: { token: string | null }) => state.token);

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (!token) {
            console.log('[SSE] No token available, skipping connection');
            return;
        }

        const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://xn--lasmuecasderamon-bub.com';
        const sseUrl = `${baseUrl}/api/sse/connect?token=${token}`;

        try {
            console.log('[SSE] Connecting to:', sseUrl);
            const eventSource = new EventSource<any>(sseUrl);
            
            eventSource.addEventListener('open', () => {
                console.log('[SSE] Connection opened');
                setIsConnected(true);
            });

            eventSource.addEventListener('message', (event: any) => {
                try {
                    const data = JSON.parse(event.data);
                    const sseEvent: SSEEvent = {
                        type: data.type || 'message',
                        data: data.payload || data,
                        timestamp: Date.now(),
                    };
                    setLastEvent(sseEvent);
                } catch (e) {
                    console.error('[SSE] Parse error:', e);
                }
            });

            eventSource.addEventListener('error', (error: any) => {
                console.log('[SSE] Connection error:', error);
                setIsConnected(false);
                eventSource.close();
                eventSourceRef.current = null;
                
                if (enabled) {
                    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('[SSE] Retrying connection...');
                        connect();
                    }, 5000);
                }
            });

            eventSourceRef.current = eventSource;
        } catch (error) {
            console.error('[SSE] Fatal error:', error);
        }
    }, [enabled, token]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        
        if (eventSourceRef.current) {
            console.log('[SSE] Closing connection cleanup');
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        
        setIsConnected(false);
    }, []);

    const reconnect = useCallback(() => {
        disconnect();
        setTimeout(connect, 200);
    }, [disconnect, connect]);

    useEffect(() => {
        if (enabled && token) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [enabled, token, connect, disconnect]);

    return { isConnected, lastEvent, reconnect, disconnect };
};

export const useSSEMessages = () => {
    const { isConnected, lastEvent, reconnect, disconnect } = useSSE(true);
    
    const [notifications, setNotifications] = useState<any[]>([]);
    const [serviceUpdates, setServiceUpdates] = useState<any[]>([]);

    useEffect(() => {
        if (lastEvent) {
            switch (lastEvent.type) {
                case 'notification':
                    setNotifications(prev => [lastEvent.data, ...prev].slice(0, 50));
                    break;
                case 'service_update':
                    setServiceUpdates(prev => [lastEvent.data, ...prev].slice(0, 20));
                    break;
            }
        }
    }, [lastEvent]);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const clearServiceUpdates = useCallback(() => {
        setServiceUpdates([]);
    }, []);

    return {
        isConnected,
        notifications,
        serviceUpdates,
        clearNotifications,
        clearServiceUpdates,
        reconnect,
        disconnect,
    };
};

export const createSSEEndpoint = (token?: string): string => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://xn--lasmuecasderamon-bub.com';
    const url = new URL(`${baseUrl}/api/sse/connect`);
    if (token) {
        url.searchParams.set('token', token);
    }
    return url.toString();
};

export const subscribeToEvents = async (
    eventTypes: string[],
    callback: (event: SSEEvent) => void
): Promise<() => void> => {
    const eventSource = new EventSource<any>('@/api/sse/connect');
    
    eventTypes.forEach(type => {
        eventSource.addEventListener(type, (event: any) => {
            try {
                const data = JSON.parse(event.data);
                callback({
                    type: type as SSEEventType,
                    data,
                    timestamp: Date.now(),
                });
            } catch (e) {
                console.error('[SSE] Parse error:', e);
            }
        });
    });

    return () => {
        eventSource.close();
    };
};

