import React, { useMemo } from "react";

import { HostessSelectModal } from "@/components/cajero/forms/HostessSelectModal";

type Hostess = {
  id_usuario?: string | number;
  id?: string | number;
  nick?: string;
  estado_servicio?: number;
};

type SelectionTarget = {
  productId: string | number;
  max: number;
  product?: any;
};

type Props = {
  visible: boolean;
  hostesses: Hostess[];
  selectedIds: string[];
  selectionTarget: SelectionTarget | null;
  onToggleHostess: (id: string) => void;
  onClose: () => void;
  onConfirmProduct: (product: any) => void;
  showToast: (title: string, message: string, type?: "success" | "error") => void;
};

export function NuevaVentaHostessModal({
  visible,
  hostesses,
  selectedIds,
  selectionTarget,
  onToggleHostess,
  onClose,
  onConfirmProduct,
  showToast,
}: Props) {
  const uniqueHostesses = useMemo(
    () =>
      hostesses.filter(
        (item, index, self) =>
          index === self.findIndex((t) => String(t.id_usuario || t.id) === String(item.id_usuario || item.id)),
      ),
    [hostesses],
  );

  const handleToggle = (id: string | number) => {
    const stringId = String(id);
    const currentSelected = selectedIds;

    if (currentSelected.includes(stringId)) {
      onToggleHostess(stringId);
      return;
    }

    if (selectionTarget?.max && currentSelected.length >= selectionTarget.max) {
      showToast("Limite", `Maximo ${selectionTarget.max} anfitrionas por esta cantidad`, "error");
      return;
    }

    onToggleHostess(stringId);
  };

  const handleConfirm = () => {
    if (!selectionTarget) return;

    const hasComm =
      Number(selectionTarget.product?.comision || selectionTarget.product?.commission || 0) > 0 ||
      Number(selectionTarget.product?.precio || selectionTarget.product?.price || 0) >= 30000;
    if (hasComm && selectedIds.length === 0) {
      showToast("Asignacion", "Debes escoger al menos 1 anfitriona", "error");
      return;
    }

    onConfirmProduct(selectionTarget.product);
  };

  return (
    <HostessSelectModal
      visible={visible}
      hostesses={uniqueHostesses.map((item) => ({
        id: String(item.id_usuario || item.id || ""),
        id_usuario: String(item.id_usuario || item.id || ""),
        nick: item.nick || "",
        estado_servicio: item.estado_servicio || 0,
      }))}
      selectedIds={selectedIds}
      max={selectionTarget?.max}
      onToggle={handleToggle}
      onClose={onClose}
      onConfirm={handleConfirm}
    />
  );
}
