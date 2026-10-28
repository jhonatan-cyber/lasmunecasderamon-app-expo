import { styles } from "./ServiceModal.styles";
import React, { useState } from "react";
import { IncludedServiceProductSelector } from "@/components/shared/IncludedServiceProductSelector";
import { showToast } from "@/hooks/utils/cartUtils";
import { Modal, ScrollView, View } from "react-native";
import { MetodoPago } from "../../types/api";
import { ServiceModalHeader } from "./ServiceModalParts/ServiceModalHeader";
import { ServiceInfoList } from "./ServiceModalParts/ServiceInfoList";
import { ServiceHostessList } from "./ServiceModalParts/ServiceHostessList";
import { ServicePaymentSection } from "./ServiceModalParts/ServicePaymentSection";
import { ServiceReceiptSummary } from "./ServiceModalParts/ServiceReceiptSummary";
import { ServiceModalActions } from "./ServiceModalParts/ServiceModalActions";

interface ServiceModalProps {
  visible: boolean;
  onClose: () => void;
  selectedService: any;
  selectedClient: any;
  loadingClient?: boolean;
  metodoPago: MetodoPago;
  setMetodoPago: (m: MetodoPago) => void;
  metodoPagoAdicional: MetodoPago;
  setMetodoPagoAdicional: (m: MetodoPago) => void;
  allHostesses: any[];
  onAprobar: (id: string, tipo: string, productoIncluido?: string) => void;
  isDark: boolean;
  isTablet: boolean;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  cardBg: string;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  visible,
  onClose,
  selectedService,
  selectedClient,
  loadingClient,
  metodoPago,
  setMetodoPago,
  metodoPagoAdicional,
  setMetodoPagoAdicional,
  allHostesses,
  onAprobar,
  isDark,
  isTablet,
  accentColor,
  accentBg,
  accentBorder,
  textPrimary,
  textSecondary,
  borderColor,
  cardBg,
}) => {
  const [includedProduct, setIncludedProduct] = useState({ requestId: "", id: "" });
  const requestId = String(selectedService?.id_solicitud || "");
  const productoIncluido =
    includedProduct.requestId === requestId
      ? includedProduct.id
      : selectedService?.producto_incluido_presentacion_id || "";
  const setProductoIncluido = (id: string) =>
    setIncludedProduct({ requestId, id });
  if (!selectedService) return null;

  const safeMoney = (value: any) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const normalized = value
        .trim()
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".");
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
      const fallback = parseFloat(value.replace(/[^0-9.-]/g, ""));
      return Number.isFinite(fallback) ? fallback : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const totalBase =
    safeMoney(selectedService.total) || safeMoney(selectedService.monto);
  const subtotalServicio =
    safeMoney(selectedService.precio_servicio) ||
    safeMoney(selectedService.sub_total) ||
    totalBase;
  const ivaActual = safeMoney(selectedService.iva ?? 0);
  const subtotalHabitacion = safeMoney(
    safeMoney(selectedService.precio_habitacion) ||
      safeMoney(selectedService.precioHabitacion) ||
      Math.max(0, totalBase - subtotalServicio - ivaActual),
  );
  const subtotalGeneral = subtotalServicio + subtotalHabitacion;
  const totalFinal = totalBase > 0 ? totalBase : subtotalGeneral + ivaActual;

  const handleApprove = () => {
    onClose();
    if (
      Number(selectedService.comision_anfitriona || 0) > 0 &&
      !productoIncluido
    ) {
      showToast("Producto incluido", "Selecciona una unidad del bar");
      return;
    }
    onAprobar(
      selectedService.id_solicitud,
      "solicitud",
      productoIncluido,
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.checkoutModal,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <ServiceModalHeader
            codigo={
              selectedService.codigo || "#" + selectedService.id_solicitud
            }
            accentColor={accentColor}
            accentBg={accentBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />

          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {Number(selectedService.comision_anfitriona || 0) > 0 && (
              <IncludedServiceProductSelector
                value={productoIncluido}
                onChange={setProductoIncluido}
              />
            )}

            <ServiceInfoList
              service={selectedService}
              isTablet={isTablet}
              accentColor={accentColor}
              textPrimary={textPrimary}
            />

            <ServiceHostessList
              service={selectedService}
              allHostesses={allHostesses}
              isTablet={isTablet}
              accentBg={accentBg}
              accentBorder={accentBorder}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />

            <ServicePaymentSection
              service={selectedService}
              selectedClient={selectedClient}
              loadingClient={loadingClient}
              metodoPago={metodoPago}
              setMetodoPago={setMetodoPago}
              metodoPagoAdicional={metodoPagoAdicional}
              setMetodoPagoAdicional={setMetodoPagoAdicional}
              isTablet={isTablet}
              accentColor={accentColor}
              accentBg={accentBg}
              accentBorder={accentBorder}
              borderColor={borderColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              subtotalGeneral={subtotalGeneral}
              ivaActual={ivaActual}
            />

            <ServiceReceiptSummary
              service={selectedService}
              isDark={isDark}
              isTablet={isTablet}
              accentColor={accentColor}
              textPrimary={textPrimary}
              borderColor={borderColor}
              subtotalServicio={subtotalServicio}
              subtotalHabitacion={subtotalHabitacion}
              ivaActual={ivaActual}
              totalFinal={totalFinal}
            />
          </ScrollView>

          <ServiceModalActions
            accentColor={accentColor}
            textSecondary={textSecondary}
            onClose={onClose}
            onApprove={handleApprove}
          />
        </View>
      </View>
    </Modal>
  );
};
