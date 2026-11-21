import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { EditServiceModal } from "@/components/cajero/forms/EditServiceModal";
import { ServiceDetailModal, type DetailAction } from "@/components/cajero/servicios/ServiceDetailModal";
import { ServiceHostessesModal } from "@/components/cajero/servicios/ServiceHostessesModal";
import type { Timer } from "@/context/types";

interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "danger";
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  confirmText?: string;
}

interface ServiciosModalesProps {
  
  editModalVisible: boolean;
  selectedTimer: any;
  onCloseEdit: () => void;
  onSuccessEdit: () => void;

  
  alertConfig: AlertConfig;
  onCloseAlert: () => void;

  
  detailModalVisible: boolean;
  selectedServiceDetail: any;
  detailAcciones: DetailAction[];
  onFinalizarDetail?: () => void;
  serverOffset: number;
  onCloseDetail: () => void;

  
  assignmentTimer: Timer | null;
  onCloseAssignment: () => void;

  
  theme: any;
}

export function ServiciosModales({
  editModalVisible,
  selectedTimer,
  onCloseEdit,
  onSuccessEdit,

  alertConfig,
  onCloseAlert,

  detailModalVisible,
  selectedServiceDetail,
  detailAcciones,
  onFinalizarDetail,
  serverOffset,
  onCloseDetail,

  assignmentTimer,
  onCloseAssignment,

  theme,
}: ServiciosModalesProps) {
  return (
    <>
      {}
      <EditServiceModal
        visible={editModalVisible}
        timer={selectedTimer}
        onClose={onCloseEdit}
        onSuccess={onSuccessEdit}
      />

      {}
      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm || onCloseAlert}
        onCancel={onCloseAlert}
      />

      <ServiceDetailModal
        visible={detailModalVisible}
        service={selectedServiceDetail}
        theme={theme}
        onClose={onCloseDetail}
        acciones={detailAcciones}
        onFinalizar={onFinalizarDetail}
        serverOffset={serverOffset}
      />

      <ServiceHostessesModal
        visible={Boolean(assignmentTimer)}
        item={assignmentTimer}
        onClose={onCloseAssignment}
      />
    </>
  );
}
