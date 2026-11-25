import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { FontSize } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';
import { styles } from "../ServiceModal.styles";
import type { MetodoPago } from "../../../types/api";
import {
  PaymentMethodSelect,
  type PaymentMethod,
} from "@/components/cajero/forms/PaymentMethodSelect";

const METODOS: PaymentMethod[] = ["efectivo", "tarjeta", "transferencia", "prepago"];

interface ServicePaymentSectionProps {
  service: any;
  selectedClient: any;
  loadingClient?: boolean;
  metodoPago: MetodoPago;
  setMetodoPago: (m: MetodoPago) => void;
  metodoPagoAdicional: MetodoPago;
  setMetodoPagoAdicional: (m: MetodoPago) => void;
  isTablet: boolean;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  subtotalGeneral: number;
  ivaActual: number;
}

export function ServicePaymentSection({
  service,
  selectedClient,
  loadingClient,
  metodoPago,
  setMetodoPago,
  metodoPagoAdicional,
  setMetodoPagoAdicional,
  isTablet,
  accentColor,
  accentBg,
  accentBorder,
  borderColor,
  textPrimary,
  textSecondary,
  subtotalGeneral,
  ivaActual,
}: ServicePaymentSectionProps) {
  const { accentOnSurface } = useAccentColor();
  const metodoActual = metodoPago || service.metodo_pago;

  return (
    <>
      <View style={[styles.infoRow, { marginBottom: 12 }]}>
        <Ionicons
          name="card-outline"
          size={isTablet ? 24 : 20}
          color={accentColor}
        />
        <Text
          style={[
            styles.infoText,
            {
              color: textPrimary,
              marginLeft: 8,
              fontSize: isTablet ? 18 : 14,
            },
          ]}
        >
          {`Método Pago: ${metodoActual.toUpperCase()}`}
        </Text>
      </View>

      {loadingClient ? (
        <View
          style={{
            marginBottom: 15,
            padding: 12,
            borderRadius: 12,
            backgroundColor: accentBg,
            borderWidth: 1,
            borderColor: accentBorder,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Skeleton width={32} height={32} borderRadius={16} />
              <View style={{ gap: 4 }}>
                <Skeleton width={100} height={14} />
                <Skeleton width={60} height={10} />
              </View>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Skeleton width={80} height={10} />
              <Skeleton width={60} height={18} />
            </View>
          </View>
        </View>
      ) : (
        selectedClient && (
          <View
            style={{
              marginBottom: 15,
              padding: 12,
              borderRadius: 12,
              backgroundColor: accentBg,
              borderWidth: 1,
              borderColor: accentBorder,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: `${accentColor}20`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person" size={18} color={accentColor} />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text
                    style={{
                      color: textPrimary,
                      fontFamily: FontFamily.extrabold,
                      fontSize: 13,
                    }}
                  >
                    {selectedClient.name} {selectedClient.lastName}
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: FontSize.xxs }}>
                    Cliente frecuente
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    color: textSecondary,
                    fontSize: FontSize.xxs,
                    fontFamily: FontFamily.extrabold,
                  }}
                >
                  SALDO DISPONIBLE
                </Text>
                <Text
                  style={{
                      color:
                      Number(selectedClient.saldo) > 0
                        ? accentOnSurface
                        : textSecondary,
                    fontSize: 16,
                    fontFamily: FontFamily.black,
                  }}
                >
                  ${Number(selectedClient.saldo || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )
      )}

      {selectedClient && (
        <View style={{ marginBottom: 20 }}>
          <PaymentMethodSelect
            label="MODIFICAR MÉTODO DE PAGO"
            variant="compact"
            methods={METODOS}
            selectedMethod={metodoActual}
            onSelect={setMetodoPago}
            disabledMethods={
              Number(selectedClient?.saldo || 0) > 0
                ? ["efectivo", "tarjeta", "transferencia"]
                : []
            }
            formatLabel={(_m, label) => label.toUpperCase()}
          />
        </View>
      )}

      {selectedClient &&
        (metodoPago === "prepago" ||
          (!metodoPago && service.metodo_pago === "prepago")) &&
        (() => {
          const subtotal = Math.floor(subtotalGeneral) + Math.floor(ivaActual);
          const saldo = Number(selectedClient.saldo || 0);
          const restante = Math.max(0, subtotal - saldo);

          if (restante > 0) {
            return (
              <View
                style={{
                  marginBottom: 20,
                  padding: 12,
                  borderRadius: 12,
                  borderStyle: "dashed",
                  borderWidth: 1,
                  borderColor: accentColor,
                }}
              >
                <Text
                  style={{
                    color: textPrimary,
                    fontSize: 12,
                    fontFamily: FontFamily.extrabold,
                    marginBottom: 8,
                  }}
                >
                  RESTANTE A PAGAR: ${restante.toLocaleString()}
                </Text>
                <PaymentMethodSelect
                  showLabel={false}
                  variant="compact"
                  methods={["efectivo", "tarjeta", "transferencia"]}
                  selectedMethod={metodoPagoAdicional}
                  onSelect={setMetodoPagoAdicional}
                  formatLabel={(_m, label) => label.toUpperCase()}
                />
              </View>
            );
          }
          return null;
        })()}
    </>
  );
}
