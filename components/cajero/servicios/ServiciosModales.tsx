import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { EditServiceModal } from "@/components/cajero/forms/EditServiceModal";
import { ServiceDetailModal } from "@/components/cajero/servicios/ServiceDetailModal";

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
  onCloseDetail: () => void;

  
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
  onCloseDetail,

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
      />
    </>
  );
}
