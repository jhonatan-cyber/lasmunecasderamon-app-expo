export const parseDateSafe = (dateStr: string | number | Date | null | undefined): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'number') return new Date(dateStr);

  if (typeof dateStr !== 'string') return new Date(dateStr);

  if (dateStr.includes('Z') || dateStr.includes('+')) return new Date(dateStr);

  try {
    // Si no tiene T, asumimos que viene en formato YYYY-MM-DD HH:MM:SS
    // No añadimos 'Z' porque el servidor ahora envía la hora local del negocio (-04:00)
    // y queremos que el dispositivo la trate como su hora local (asumiendo que están en la misma zona).
    const cleanDateStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const date = new Date(cleanDateStr);
    
    if (!isNaN(date.getTime())) return date;
    return new Date(dateStr);
  } catch {
    return new Date(dateStr);
  }
};

export const calculateRemainingTime = (
  timer: { startTime: Date | string; duration: number; isPaused: boolean; remainingTime: number },
  serverOffset: number = 0
): number => {
  if (timer.isPaused) {
    return timer.remainingTime;
  }

  const start = typeof timer.startTime === 'string' ? parseDateSafe(timer.startTime) : timer.startTime;
  const now = new Date(Date.now() + serverOffset);

  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  const totalDurationSeconds = (Number(timer.duration) || 0) * 60;
  const remaining = totalDurationSeconds - elapsedSeconds;

  return isNaN(remaining) ? 0 : Math.max(0, remaining);
};

export const formatTime = (seconds: number): string => {
  const absSeconds = Math.abs(seconds);
  const minutes = Math.floor(absSeconds / 60);
  const remainingSeconds = Math.floor(absSeconds % 60);
  return `${seconds < 0 ? '-' : ''}${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
