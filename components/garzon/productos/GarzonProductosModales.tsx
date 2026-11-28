import React from "react";
import { ClientSelectModal } from "@/components/cajero/forms/ClientSelectModal";
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { Client } from "@/hooks/useGarzonProductos";

interface GarzonProductosModalesProps {
  clientModalVisible: boolean;
  setClientModalVisible: (visible: boolean) => void;
  clients: Client[];
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;

  clearCartAlertVisible: boolean;
  setClearCartAlertVisible: (visible: boolean) => void;
  clearCart: () => void;
  setActiveConfigItem: (
    item: { productId: string; type: "hostess" | "room" } | null,
  ) => void;
}

export const GarzonProductosModales: React.FC<GarzonProductosModalesProps> = ({
  clientModalVisible,
  setClientModalVisible,
  clients,
  selectedClientId,
  setSelectedClientId,
  clearCartAlertVisible,
  setClearCartAlertVisible,
  clearCart,
  setActiveConfigItem,
}) => {
  return (
    <>
      {}
      <ClientSelectModal
        visible={clientModalVisible}
        onClose={() => setClientModalVisible(false)}
        clients={clients as any}
        selectedIds={selectedClientId ? [selectedClientId] : []}
        onToggle={(id) => {
          setSelectedClientId(
            selectedClientId === String(id) ? null : String(id),
          );
          setClientModalVisible(false);
        }}
      />

      {}
      <PremiumAlert
        visible={clearCartAlertVisible}
        title="Vaciar Carrito"
        message="¿Estás seguro que deseas eliminar todos los productos del pedido? Esta acción no se puede deshacer."
        type="danger"
        showCancel
        confirmText="Sí, vaciar"
        cancelText="Cancelar"
        onConfirm={() => {
          clearCart();
          setActiveConfigItem(null);
          setClearCartAlertVisible(false);
        }}
        onCancel={() => setClearCartAlertVisible(false)}
      />
    </>
  );
};
