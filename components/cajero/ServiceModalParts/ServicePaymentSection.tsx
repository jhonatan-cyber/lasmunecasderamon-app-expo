import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { styles } from "../ServiceModal.styles";
import type { MetodoPago } from "../../../types/api";

const METODOS: MetodoPago[] = ["efectivo", "tarjeta", "transferencia", "prepago"];

const ICONO_METODO: Record<string, ComponentProps<typeof Ionicons>["name"]> = {
  efectivo: "cash",
  tarjeta: "card",
  prepago: "wallet",
  transferencia: "swap-horizontal",
};

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
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    {selectedClient.name} {selectedClient.lastName}
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 10 }}>
                    Cliente frecuente
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    color: textSecondary,
                    fontSize: 10,
                    fontWeight: "800",
                  }}
                >
                  SALDO DISPONIBLE
                </Text>
                <Text
                  style={{
                    color:
                      Number(selectedClient.saldo) > 0
                        ? "#10B981"
                        : textSecondary,
                    fontSize: 16,
                    fontWeight: "900",
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
          <Text
            style={[
              styles.sectionTitle,
              {
                color: textPrimary,
                fontSize: 11,
                marginBottom: 8,
                letterSpacing: 0.5,
              },
            ]}
          >
            MODIFICAR MÉTODO DE PAGO
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {METODOS.map((m) => {
              const isSelected = metodoActual === m;
              const isLockedPrepago =
                m !== "prepago" && Number(selectedClient?.saldo || 0) > 0;

              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    if (isLockedPrepago) return;
                    setMetodoPago(m);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isSelected ? accentColor : borderColor,
                    backgroundColor: isSelected
                      ? `${accentColor}15`
                      : "transparent",
                    alignItems: "center",
                    opacity: isLockedPrepago ? 0.4 : 1,
                  }}
                >
                  <Ionicons
                    name={ICONO_METODO[m]}
                    size={16}
                    color={isSelected ? accentColor : textSecondary}
                  />
                  <Text
                    style={{
                      color: isSelected ? accentColor : textSecondary,
                      fontSize: 9,
                      fontWeight: "800",
                      marginTop: 4,
                    }}
                  >
                    {m.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
                    fontWeight: "800",
                    marginBottom: 8,
                  }}
                >
                  RESTANTE A PAGAR: ${restante.toLocaleString()}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["efectivo", "tarjeta", "transferencia"] as MetodoPago[]).map(
                    (m) => (
                      <Pressable
                        key={m}
                        onPress={() => setMetodoPagoAdicional(m)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor:
                            metodoPagoAdicional === m
                              ? accentColor
                              : borderColor,
                          backgroundColor:
                            metodoPagoAdicional === m
                              ? `${accentColor}10`
                              : "transparent",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color:
                              metodoPagoAdicional === m
                                ? accentColor
                                : textSecondary,
                            fontSize: 9,
                            fontWeight: "800",
                          }}
                        >
                          {m.toUpperCase()}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            );
          }
          return null;
        })()}
    </>
  );
}
