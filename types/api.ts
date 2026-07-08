
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

/** Active service from /servicios/user where estado === 2 */
export interface ActiveService {
  habitacion: string;
  estado: number;
  codigo?: string;
  tiempo?: number;
  clienteNombre?: string;
  anfitrionas?: string;
}

/** Profile data returned by /users/profile and /users PUT */
export interface UserProfileResponse {
  nick?: string;
  telefono?: string;
  phone?: string;
  direccion?: string;
  address?: string;
  estado_civil?: string;
  maritalStatus?: string;
  foto?: string;
  status?: number;
}

export interface DashboardState {
  loading: boolean;
  refreshing: boolean;
  events: DashboardEvent[];
  stats: DashboardStats;
  userStatus: number;
  hasNewAlert: boolean;
  selectedDates: string[];
  activeService: ActiveService | null;
  pendingCount: number;
}
