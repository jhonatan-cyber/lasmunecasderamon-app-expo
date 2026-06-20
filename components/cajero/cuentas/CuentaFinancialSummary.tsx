import { Text, View } from "react-native";
import { parseDateSafe } from "@/utils/timeUtils";

interface SolicitudAnulacion {
  id?: string | number;
  estado?: string;
  monto?: number;
  fecha_crea?: string;
  fecha_mod?: string;
  motivo?: string;
}

interface Props {
  totalOriginal: number;
  totalActual: number;
  totalAnulado: number;
  totalPendiente: number;
  solicitudes: SolicitudAnulacion[];
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  isDark: boolean;
}

function formatLocale(dateStr: string) {
  return parseDateSafe(dateStr).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).replace(/,/g, "");
}

export default function CuentaFinancialSummary({
  totalOriginal,
  totalActual,
  totalAnulado,
  totalPendiente,
  solicitudes,
  textPrimary,
  textSecondary,
  borderColor,
  isDark,
}: Props) {
  return (
    <View style={{ marginTop: 22, paddingHorizontal: 4 }}>
      <Text style={{
        fontSize: 13, fontWeight: "900", color: textSecondary, marginBottom: 12,
        textTransform: "uppercase", letterSpacing: 1.5,
      }}>
        Resumen financiero
      </Text>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: isDark ? "#1A1A1A" : "#F8FAFC", borderRadius: 20, padding: 14, borderWidth: 1, borderColor }}>
            <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "900" }}>TOTAL ORIGINAL</Text>
            <Text style={{ color: textPrimary, fontSize: 20, fontWeight: "900", marginTop: 6 }}>
              ${totalOriginal.toLocaleString("es-CL")}
            </Text>
          </View>

          <View style={{ flex: 1, backgroundColor: isDark ? "#221417" : "#FFF1F2", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: isDark ? "#3F1D24" : "#FECDD3" }}>
            <Text style={{ color: "#E11D48", fontSize: 11, fontWeight: "900" }}>ANULADO APROBADO</Text>
            <Text style={{ color: "#E11D48", fontSize: 20, fontWeight: "900", marginTop: 6 }}>
              ${totalAnulado.toLocaleString("es-CL")}
            </Text>
            {totalPendiente > 0 && (
              <Text style={{ color: isDark ? "#FBBF24" : "#B45309", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                Pendiente: ${totalPendiente.toLocaleString("es-CL")}
              </Text>
            )}
          </View>
        </View>

        <View style={{ backgroundColor: isDark ? "#13261D" : "#ECFDF5", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: isDark ? "#1F5139" : "#A7F3D0" }}>
          <Text style={{ color: "#10B981", fontSize: 11, fontWeight: "900" }}>TOTAL ACTUAL A COBRAR</Text>
          <Text style={{ color: "#10B981", fontSize: 24, fontWeight: "900", marginTop: 6 }}>
            ${totalActual.toLocaleString("es-CL")}
          </Text>
        </View>
      </View>

      {solicitudes.length > 0 && (
        <View style={{ marginTop: 14, gap: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "900", color: textSecondary }}>Historial de anulacion</Text>
          {solicitudes.map((sol, index) => {
            const estado = String(sol.estado || "").toLowerCase();
            const chipBg =
              estado === "aprobado" ? (isDark ? "#13261D" : "#ECFDF5") :
              estado === "rechazado" ? (isDark ? "#221417" : "#FFF1F2") :
              (isDark ? "#2A2114" : "#FFF7ED");
            const chipColor =
              estado === "aprobado" ? "#10B981" :
              estado === "rechazado" ? "#E11D48" :
              "#D97706";

            return (
              <View
                key={sol.id || index}
                style={{ backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderRadius: 20, padding: 14, borderWidth: 1, borderColor }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ color: textPrimary, fontWeight: "900", fontSize: 16 }}>
                    ${Number(sol.monto || 0).toLocaleString("es-CL")}
                  </Text>
                  <View style={{ backgroundColor: chipBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ color: chipColor, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>
                      {estado || "pendiente"}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: textSecondary, fontSize: 12 }}>
                  Solicitada: {sol.fecha_crea ? formatLocale(sol.fecha_crea) : "-"}
                </Text>
                {!!sol.fecha_mod && estado !== "pendiente" && (
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                    Resuelta: {formatLocale(sol.fecha_mod)}
                  </Text>
                )}
                {!!sol.motivo && (
                  <Text style={{ color: textPrimary, fontSize: 13, marginTop: 8, lineHeight: 18 }}>
                    {sol.motivo}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
