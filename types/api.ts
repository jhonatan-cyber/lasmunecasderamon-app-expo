
export { type MetodoPago, type UserRole } from '@lasmunecasderamon/types';


export interface ApiRes<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
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
