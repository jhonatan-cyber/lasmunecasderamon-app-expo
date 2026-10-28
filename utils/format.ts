export const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${(num || 0).toLocaleString('es-CL')}`;
};

export const safeNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const normalized = value.trim().replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
        const parsed = Number(normalized);
        if (Number.isFinite(parsed)) return parsed;
        const fallback = parseFloat(value.replace(/[^0-9.-]/g, ''));
        return Number.isFinite(fallback) ? fallback : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Fecha inválida';

    return d.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export const formatTime = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    return d.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
    });
};
