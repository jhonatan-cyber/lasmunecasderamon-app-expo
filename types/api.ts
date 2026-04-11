export interface ApiRes<T> {
    success: boolean;
    data: T;
    error?: string;
    message?: string;
}

export interface User {
    id: number;
    nombre: string;
    email: string;
    role: string;
    status: number;
}

export interface DashboardEvent {
    id: number;
    titulo: string;
    fecha_crea: string;
    descripcion?: string;
    monto?: number;
    codigo?: string;
}

export interface DashboardStats {
    weeklyIncome: number[];
    badges: string[];
    totalEarnings: number;
    svcCount: number;
}

export interface DashboardState {
    loading: boolean;
    refreshing: boolean;
    events: DashboardEvent[];
    stats: DashboardStats;
    userStatus: number;
    hasNewAlert: boolean;
    selectedDates: string[];
    activeService: any | null;
    pendingCount: number;
}

export type UserRole = 'anfitriona' | 'garzon' | 'cajero';

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago' | '';
