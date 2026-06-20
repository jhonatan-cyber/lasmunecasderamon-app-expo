export type PendingAutoOpen = { id: string; type: string } | null;

export interface UseSolicitudesActionsParams {
  solicitudes: any[];
  cajaAbierta: boolean;
  fetchSolicitudes: (isManual?: boolean) => Promise<void>;
  removeSolicitudLocally: (id: string, tipo: "pedido" | "solicitud" | "anticipo") => void;
  pendingAutoOpen: PendingAutoOpen;
  setPendingAutoOpen: (value: PendingAutoOpen) => void;
  openId?: string | string[];
  queryType?: string | string[];
}

export type AlertType = "info" | "success" | "warning" | "danger";

export interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  type: AlertType;
  onConfirm?: () => void;
}
