import { Text, View } from "react-native";
import { parseDateSafe } from "@/utils/timeUtils";

interface RoomEntry {
  roomId?: string;
  startedAt?: string;
  endedAt?: string;
  roomName?: string;
  isActive?: boolean;
  assignedMinutes?: number;
  consumedMinutes?: number;
  remainingMinutes?: number;
  carriedFromPrevious?: boolean;
}

interface Props {
  roomHistory: RoomEntry[];
  totalRoomTime: number;
  activeRoomTime: number;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  isDark: boolean;
  styles: Record<string, any>;
}

function formatLocale(dateStr: string) {
  return parseDateSafe(dateStr).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).replace(/,/g, "");
}

export default function CuentaRoomHistory({
  roomHistory,
  totalRoomTime,
  activeRoomTime,
  accentColor,
  textPrimary,
  textSecondary,
  borderColor,
  isDark,
  styles,
}: Props) {
  if (totalRoomTime <= 0 && roomHistory.length === 0) return null;

  return (
    <View style={{ marginTop: 22, paddingHorizontal: 4 }}>
      <Text style={{
        fontSize: 13, fontWeight: "900", color: textSecondary, marginBottom: 12,
        textTransform: "uppercase", letterSpacing: 1.5
      }}>
        Historial de Habitacion
      </Text>

      <View style={{
        backgroundColor: isDark ? "#171717" : "#F8FAFC",
        borderRadius: 22, padding: 16, borderWidth: 1, borderColor, marginBottom: 14,
      }}>
        <Text style={[styles.gridLabel, { color: textSecondary }]}>TIEMPO TOTAL REGISTRADO</Text>
        <Text style={[styles.gridValue, { color: textPrimary, fontWeight: "900", marginTop: 4 }]}>
          {totalRoomTime} min
        </Text>
        {activeRoomTime > 0 && (
          <Text style={{ color: accentColor, fontSize: 12, fontWeight: "700", marginTop: 4 }}>
            Timer activo: {activeRoomTime} min
          </Text>
        )}
      </View>

      {roomHistory.length > 0 && (
        <View style={{ gap: 10 }}>
          {roomHistory.map((entry, index) => {
            const assignedMinutes = Number(entry.assignedMinutes || 0);
            const consumedMinutes = Number(entry.consumedMinutes || 0);
            const remainingMinutes = Math.max(0, Number(entry.remainingMinutes ?? assignedMinutes - consumedMinutes));

            return (
              <View
                key={`${entry.roomId || "room"}-${entry.startedAt || index}-${index}`}
                style={{
                  backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                  borderRadius: 20, padding: 14, borderWidth: 1, borderColor,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ color: textPrimary, fontWeight: "900", fontSize: 14 }}>
                    {entry.roomName || "Habitacion"}
                  </Text>
                  <Text style={{ color: entry.isActive ? accentColor : textSecondary, fontWeight: "800", fontSize: 12 }}>
                    {entry.isActive ? "Activo" : "Finalizado"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                  <View style={{ flex: 1, backgroundColor: isDark ? "#262626" : "#F8FAFC", borderRadius: 14, padding: 10 }}>
                    <Text style={{ color: textSecondary, fontSize: 10, fontWeight: "900" }}>ASIGNADO</Text>
                    <Text style={{ color: textPrimary, fontSize: 15, fontWeight: "900", marginTop: 4 }}>{assignedMinutes} min</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: isDark ? "#2A2114" : "#FFF7ED", borderRadius: 14, padding: 10 }}>
                    <Text style={{ color: isDark ? "#FBBF24" : "#C2410C", fontSize: 10, fontWeight: "900" }}>CONSUMIDO</Text>
                    <Text style={{ color: isDark ? "#FBBF24" : "#C2410C", fontSize: 15, fontWeight: "900", marginTop: 4 }}>{consumedMinutes} min</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: isDark ? "#13261D" : "#ECFDF5", borderRadius: 14, padding: 10 }}>
                    <Text style={{ color: "#10B981", fontSize: 10, fontWeight: "900" }}>RESTANTE</Text>
                    <Text style={{ color: "#10B981", fontSize: 15, fontWeight: "900", marginTop: 4 }}>{remainingMinutes} min</Text>
                  </View>
                </View>

                <Text style={{ color: textSecondary, fontSize: 12 }}>
                  Inicio: {entry.startedAt ? formatLocale(entry.startedAt) : "-"}
                </Text>
                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                  Fin: {entry.endedAt ? formatLocale(entry.endedAt) : "En curso"}
                </Text>
                {entry.carriedFromPrevious && (
                  <Text style={{ color: accentColor, fontSize: 12, fontWeight: "700", marginTop: 6 }}>
                    Tiempo agregado tras cambio de habitacion
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
