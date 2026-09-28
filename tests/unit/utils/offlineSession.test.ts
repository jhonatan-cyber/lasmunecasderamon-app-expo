import { describe, it, expect } from 'vitest';

import {
    CLOCK_ROLLBACK_TOLERANCE_MS,
    createOfflineSession,
    isOfflineSessionValid,
    OFFLINE_SESSION_GRACE_MS,
    OFFLINE_SESSION_REFRESH_INTERVAL_MS,
    offlineSessionAgeMs,
    offlineSessionRemainingMs,
    parseOfflineSession,
    serializeOfflineSession,
    shouldRefreshOfflineSession,
} from '@/utils/offlineSession';

const NOW = 1_800_000_000_000;

describe('createOfflineSession', () => {
    it('debe crear el marcador con el usuario y el instante actual', () => {
        expect(createOfflineSession('usuario-1', NOW)).toEqual({
            userId: 'usuario-1',
            savedAt: NOW,
        });
    });

    it('no debe crear marcador sin usuario', () => {
        expect(createOfflineSession(null, NOW)).toBeNull();
        expect(createOfflineSession(undefined, NOW)).toBeNull();
        expect(createOfflineSession('', NOW)).toBeNull();
    });
});

describe('isOfflineSessionValid', () => {
    it('debe ser válida dentro de la ventana de gracia', () => {
        const session = createOfflineSession('u1', NOW)!;

        expect(isOfflineSessionValid(session, NOW)).toBe(true);
        expect(isOfflineSessionValid(session, NOW + OFFLINE_SESSION_GRACE_MS)).toBe(true);
    });

    it('debe vencer pasada la ventana', () => {
        const session = createOfflineSession('u1', NOW)!;

        expect(isOfflineSessionValid(session, NOW + OFFLINE_SESSION_GRACE_MS + 1)).toBe(false);
    });

    it('no debe ser válida sin marcador o con datos incompletos', () => {
        expect(isOfflineSessionValid(null, NOW)).toBe(false);
        expect(isOfflineSessionValid({ userId: '', savedAt: NOW }, NOW)).toBe(false);
        expect(isOfflineSessionValid({ userId: 'u1', savedAt: NaN }, NOW)).toBe(false);
    });

    it('debe rechazar un reloj movido hacia atrás más allá de la tolerancia', () => {
        const session = createOfflineSession('u1', NOW + CLOCK_ROLLBACK_TOLERANCE_MS + 1)!;

        expect(isOfflineSessionValid(session, NOW)).toBe(false);
    });

    it('debe tolerar una diferencia leve de reloj', () => {
        const session = createOfflineSession('u1', NOW + CLOCK_ROLLBACK_TOLERANCE_MS - 1)!;

        expect(isOfflineSessionValid(session, NOW)).toBe(true);
    });

    it('debe aceptar una ventana de gracia explícita', () => {
        const session = createOfflineSession('u1', NOW)!;

        expect(isOfflineSessionValid(session, NOW + 61_000, 60_000)).toBe(false);
        expect(isOfflineSessionValid(session, NOW + 59_000, 60_000)).toBe(true);
    });
});

describe('offlineSessionRemainingMs', () => {
    it('debe devolver lo que resta de ventana', () => {
        const session = createOfflineSession('u1', NOW)!;

        expect(offlineSessionRemainingMs(session, NOW)).toBe(OFFLINE_SESSION_GRACE_MS);
        expect(offlineSessionRemainingMs(session, NOW + 60_000)).toBe(
            OFFLINE_SESSION_GRACE_MS - 60_000
        );
    });

    it('debe devolver 0 cuando ya venció', () => {
        const session = createOfflineSession('u1', NOW)!;

        expect(offlineSessionRemainingMs(session, NOW + OFFLINE_SESSION_GRACE_MS + 1)).toBe(0);
        expect(offlineSessionRemainingMs(null, NOW)).toBe(0);
    });
});

describe('serialización', () => {
    it('debe sobrevivir el roundtrip', () => {
        const session = createOfflineSession('u1', NOW)!;

        expect(parseOfflineSession(serializeOfflineSession(session))).toEqual(session);
    });

    it('debe tolerar JSON roto o vacío', () => {
        expect(parseOfflineSession(null)).toBeNull();
        expect(parseOfflineSession('')).toBeNull();
        expect(parseOfflineSession('{no-es-json')).toBeNull();
        expect(parseOfflineSession('{"userId":""}')).toBeNull();
        expect(parseOfflineSession('{"userId":"u1"}')).toBeNull();
        expect(parseOfflineSession('{"userId":"u1","savedAt":"ayer"}')).toBeNull();
    });
});

describe('shouldRefreshOfflineSession', () => {
    it('debe refrescar cuando no hay marcador o es de otro usuario', () => {
        expect(shouldRefreshOfflineSession(null, 'u1', NOW)).toBe(true);
        expect(shouldRefreshOfflineSession(createOfflineSession('u2', NOW), 'u1', NOW)).toBe(true);
    });

    it('no debe refrescar dentro del intervalo, sí pasado', () => {
        const session = createOfflineSession('u1', NOW)!;

        expect(shouldRefreshOfflineSession(session, 'u1', NOW + 1_000)).toBe(false);
        expect(
            shouldRefreshOfflineSession(session, 'u1', NOW + OFFLINE_SESSION_REFRESH_INTERVAL_MS)
        ).toBe(true);
    });

    it('debe refrescar si la ventana ya venció', () => {
        const session = createOfflineSession('u1', NOW)!;

        expect(
            shouldRefreshOfflineSession(session, 'u1', NOW + OFFLINE_SESSION_GRACE_MS + 1)
        ).toBe(true);
    });

    it('no debe refrescar sin usuario resolvido', () => {
        expect(shouldRefreshOfflineSession(null, null, NOW)).toBe(false);
        expect(shouldRefreshOfflineSession(null, undefined, NOW)).toBe(false);
    });
});

describe('offlineSessionAgeMs', () => {
    it('debe medir la antigüedad del marcador', () => {
        expect(offlineSessionAgeMs(createOfflineSession('u1', NOW)!, NOW + 5_000)).toBe(5_000);
    });
});
