/**
 * Ventana de gracia de sesión offline.
 *
 * `savedAt` es la última vez que el **servidor confirmó** la sesión (login
 * exitoso o `/auth/me` correcto). Mientras la ventana siga abierta la app puede
 * seguir operando sin red y encolar trabajo para después; cuando se cierra hay
 * que volver a autenticarse antes de crear nuevas operaciones.
 *
 * Doce horas cubre un turno completo (incluido el cierre de madrugada) sin dejar
 * una tablet olvidada con acceso indefinido a movimientos de dinero.
 */
export const OFFLINE_SESSION_GRACE_MS = 12 * 60 * 60 * 1000;

/**
 * Tolerancia para relojes movidos hacia atrás. Si el dispositivo dice que la
 * sesión se guardó "en el futuro" más allá de este margen, el marcador se
 * considera manipulado y deja de ser válido.
 */
export const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Cada cuánto se reescribe el marcador cuando el servidor confirma la sesión.
 * Evita escribir en disco en cada petición sin dejar que el marcador envejezca
 * durante un turno largo con buena conexión.
 */
export const OFFLINE_SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const OFFLINE_SESSION_STORAGE_KEY = 'offline_session_v1';

export interface OfflineSession {
    userId: string;
    /** Epoch ms de la última confirmación contra el servidor. */
    savedAt: number;
}

/** Crea el marcador de sesión. Sin usuario no hay sesión offline que valga. */
export function createOfflineSession(
    userId: string | null | undefined,
    now: number = Date.now()
): OfflineSession | null {
    if (!userId) return null;
    return { userId, savedAt: now };
}

export function offlineSessionAgeMs(session: OfflineSession, now: number = Date.now()): number {
    return now - session.savedAt;
}

export function isOfflineSessionValid(
    session: OfflineSession | null | undefined,
    now: number = Date.now(),
    graceMs: number = OFFLINE_SESSION_GRACE_MS
): boolean {
    if (!session || !session.userId) return false;
    if (!Number.isFinite(session.savedAt)) return false;
    if (session.savedAt > now + CLOCK_ROLLBACK_TOLERANCE_MS) return false;

    return offlineSessionAgeMs(session, now) <= graceMs;
}

/** Milisegundos que le quedan a la ventana; 0 si ya venció o es inválida. */
export function offlineSessionRemainingMs(
    session: OfflineSession | null | undefined,
    now: number = Date.now(),
    graceMs: number = OFFLINE_SESSION_GRACE_MS
): number {
    if (!session || !isOfflineSessionValid(session, now, graceMs)) return 0;
    return Math.max(0, graceMs - offlineSessionAgeMs(session, now));
}

/** Lectura tolerante: un JSON roto equivale a no tener marcador. */
export function parseOfflineSession(raw: string | null | undefined): OfflineSession | null {
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as Partial<OfflineSession> | null;
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.userId !== 'string' || !parsed.userId) return null;
        if (typeof parsed.savedAt !== 'number' || !Number.isFinite(parsed.savedAt)) return null;
        return { userId: parsed.userId, savedAt: parsed.savedAt };
    } catch {
        return null;
    }
}

export function serializeOfflineSession(session: OfflineSession): string {
    return JSON.stringify(session);
}

/**
 * ¿Vale la pena reescribir el marcador con esta confirmación del servidor?
 * Solo si no hay marcador, ya venció, es de otro usuario o pasó el intervalo.
 */
export function shouldRefreshOfflineSession(
    session: OfflineSession | null | undefined,
    userId: string | null | undefined,
    now: number = Date.now(),
    intervalMs: number = OFFLINE_SESSION_REFRESH_INTERVAL_MS
): boolean {
    if (!userId) return false;
    if (!session || session.userId !== userId) return true;
    if (!isOfflineSessionValid(session, now)) return true;

    return offlineSessionAgeMs(session, now) >= intervalMs;
}
