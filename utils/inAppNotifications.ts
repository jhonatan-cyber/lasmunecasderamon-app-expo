export type AppNotificationType = 'success' | 'error' | 'info' | 'warning' | 'order';

export interface ShowToastParams {
  type?: AppNotificationType;
  text1?: string;
  text2?: string;
  visibilityTime?: number;
}

export interface AppNotification {
  id: number;
  type: AppNotificationType;
  text1?: string;
  text2?: string;
  visibilityTime: number;
}

type Listener = (notification: AppNotification | null) => void;

const DEFAULT_VISIBILITY_MS = 4000;

const listeners = new Set<Listener>();
const queue: AppNotification[] = [];
let current: AppNotification | null = null;
let nextId = 1;

function emit() {
  for (const listener of listeners) listener(current);
}

/** Encola un aviso; si ya hay uno visible, espera su turno. */
export function showToast(params: ShowToastParams) {
  const notification: AppNotification = {
    id: nextId++,
    type: params.type ?? 'info',
    text1: params.text1,
    text2: params.text2,
    visibilityTime: params.visibilityTime ?? DEFAULT_VISIBILITY_MS,
  };
  if (current) queue.push(notification);
  else current = notification;
  emit();
}

/** Cierra el aviso visible y pasa al siguiente de la cola. */
export function hideToast() {
  current = queue.shift() ?? null;
  emit();
}

export function getCurrentNotification(): AppNotification | null {
  return current;
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
