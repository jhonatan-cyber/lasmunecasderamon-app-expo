import React from "react";
import { View } from "react-native";
import { HostessSelectModal } from "@/components/cajero/forms/HostessSelectModal";
import { RoomSelectModal } from "@/components/cajero/forms/RoomSelectModal";
import { ProductsCategoryModal } from "./ProductsCategoryModal";
import { ExtraTiempoModal } from "./ExtraTiempoModal";
import { isChampagneProduct, getChampagneLimit } from "@/hooks/useAgregarCuenta";

type AgregarCuentaModalesProps = {
  
  modalOpen: boolean;
  modalCategoria: any;
  modalProducts: any[];
  modalLoading: boolean;
  modalQuantities: { [key: number]: number };
  modalHostessSelections: { [key: number]: (string | number)[] };
  accountHostessIds: number[];
  onCloseCategoryModal: () => void;
  onSetQuantity: (productId: number, qty: number) => void;
  onSetHostessTarget: (target: any) => void;
  onSetModalHostesses: (productId: number, hostesses: (string | number)[]) => void;
  onSelectProduct: (product: any) => void;

  
  timeModalVisible: boolean;
  onCloseTimeModal: () => void;
  extraTiempo: number;
  onSelectTimeOption: (t: number) => void;

  
  hostessSubModalVisible: boolean;
  hostessSelectionTarget: any;
  uniqueHostesses: any[];
  selectedHostessIds: (string | number)[];
  onToggleHostess: (id: string | number) => void;
  onCloseHostessModal: () => void;
  onConfirmHostess: () => void;

  
  roomModalVisible: boolean;
  habitaciones: any[];
  selectedHabitacion: any;
  onCloseRoomModal: () => void;
  onSelectRoom: (room: any) => void;

  
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  accentColor: string;
  bg: string;
  isDark: boolean;
};

export function AgregarCuentaModales({
  modalOpen,
  modalCategoria,
  modalProducts,
  modalLoading,
  modalQuantities,
  modalHostessSelections,
  accountHostessIds,
  onCloseCategoryModal,
  onSetQuantity,
  onSetHostessTarget,
  onSetModalHostesses,
  onSelectProduct,

  timeModalVisible,
  onCloseTimeModal,
  extraTiempo,
  onSelectTimeOption,

  hostessSubModalVisible,
  hostessSelectionTarget,
  uniqueHostesses,
  selectedHostessIds,
  onToggleHostess,
  onCloseHostessModal,
  onConfirmHostess,

  roomModalVisible,
  habitaciones,
  selectedHabitacion,
  onCloseRoomModal,
  onSelectRoom,

  cardBg,
  borderColor,
  textPrimary,
  accentColor,
  bg,
  isDark,
}: AgregarCuentaModalesProps) {
  return (
    <View style={{ height: 0 }}>
      <ProductsCategoryModal
        visible={modalOpen}
        onClose={onCloseCategoryModal}
        category={modalCategoria}
        products={modalProducts}
        loading={modalLoading}
        quantities={modalQuantities}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        onSetQuantity={onSetQuantity}
        onSelectProduct={(item) => {
          const id = item.id || item.id_producto;
          const hasComm = Number(item.comision || item.commission || 0) > 0;
          if (hasComm) {
            const price = item.precio ?? item.price ?? 0;
            const qty = modalQuantities[id] || 1;
            
            
            const max =
              price < 160000
                ? qty
                : isChampagneProduct(item)
                  ? getChampagneLimit(price) * qty
                  : qty;
            const currentSelections = modalHostessSelections[id] || [];
            if (currentSelections.length === 0 && accountHostessIds.length > 0) {
              const preSelected = accountHostessIds.slice(0, max);
              onSetModalHostesses(id, preSelected);
            }
            onSetHostessTarget({
              productId: id,
              product: item,
              max,
              isChampagne: isChampagneProduct(item),
            });
          } else {
            onSelectProduct(item);
          }
        }}
      />

      <ExtraTiempoModal
        visible={timeModalVisible}
        onClose={onCloseTimeModal}
        extraTiempo={extraTiempo}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        onSelectOption={onSelectTimeOption}
      />

      <HostessSelectModal
        visible={hostessSubModalVisible && hostessSelectionTarget !== null}
        hostesses={uniqueHostesses}
        selectedIds={selectedHostessIds}
        max={hostessSelectionTarget?.max}
        onToggle={onToggleHostess}
        onClose={onCloseHostessModal}
        onConfirm={onConfirmHostess}
      />

      <RoomSelectModal
        visible={roomModalVisible}
        rooms={habitaciones}
        selectedRoomId={selectedHabitacion?.id_habitacion || selectedHabitacion?.id}
        onClose={onCloseRoomModal}
        onSelect={onSelectRoom}
      />
    </View>
  );
}
