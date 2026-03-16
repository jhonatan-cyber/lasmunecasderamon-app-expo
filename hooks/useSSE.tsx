import { useEffect, useRef, useCallback, useState } from 'react';

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
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<any>(null);

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const sseUrl = '/api/sse/connect';

        try {
            const eventSource = new EventSource(sseUrl);
            
            eventSource.onopen = () => {
                console.log('[SSE] Connected');
                setIsConnected(true);
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const sseEvent: SSEEvent = {
                        type: data.type || 'message',
                        data: data.payload || data,
                        timestamp: Date.now(),
                    };
                    setLastEvent(sseEvent);
                } catch (e) {
                    console.log('[SSE] Non-JSON message:', event.data);
                }
            };

            eventSource.onerror = (error) => {
                console.log('[SSE] Error:', error);
                setIsConnected(false);
                eventSource.close();
                
                if (enabled) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('[SSE] Reconnecting...');
                        connect();
                    }, 5000);
                }
            };

            eventSourceRef.current = eventSource;
        } catch (error) {
            console.error('[SSE] Connection failed:', error);
        }
    }, [enabled]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        
        setIsConnected(false);
    }, []);

    const reconnect = useCallback(() => {
        disconnect();
        setTimeout(connect, 100);
    }, [disconnect, connect]);

    useEffect(() => {
        if (enabled) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [enabled, connect, disconnect]);

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
    const eventSource = new EventSource('/api/sse/connect');
    
    eventTypes.forEach(type => {
        eventSource.addEventListener(type, (event) => {
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