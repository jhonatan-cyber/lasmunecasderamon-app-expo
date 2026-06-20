import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";
import { BASE_URL } from "@/api/client";

interface DetalleItem {
  producto?: string;
  hostess_nick?: string;
  added_by?: string;
  added_by_foto?: string;
  cantidad: number;
  sub_total: number;
  comision?: number;
}

interface GroupedItem extends DetalleItem {
  groupKey: string;
  comision: number;
}

interface Props {
  detalles: DetalleItem[];
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  isDark: boolean;
}

function groupDetalles(detalles: DetalleItem[]) {
  return detalles.reduce((acc: GroupedItem[], current) => {
    const key = `${current.producto}-${current.hostess_nick || "SIN ANFITRIONA"}-${current.added_by || "S"}`;
    const existingIndex = acc.findIndex((item) => item.groupKey === key);
    if (existingIndex > -1) {
      acc[existingIndex].cantidad += current.cantidad;
      acc[existingIndex].sub_total += current.sub_total;
      acc[existingIndex].comision += current.comision ?? 0;
    } else {
      acc.push({ ...current, comision: current.comision ?? 0, groupKey: key });
    }
    return acc;
  }, [] as GroupedItem[]);
}

export default function CuentaConsumptionDetail({
  detalles,
  accentColor,
  textPrimary,
  textSecondary,
  borderColor,
  isDark,
}: Props) {
  const grouped = groupDetalles(detalles);

  return (
    <View style={{ marginTop: 25, paddingHorizontal: 4 }}>
      <Text style={{
        fontSize: 13, fontWeight: "900", color: textSecondary, marginBottom: 15,
        textTransform: "uppercase", letterSpacing: 1.5,
      }}>
        Detalle de Consumo
      </Text>

      {grouped.length === 0 ? (
        <View style={{
          padding: 40, alignItems: "center", backgroundColor: isDark ? "#111" : "#F5F5F5",
          borderRadius: 24, borderStyle: "dashed", borderWidth: 1, borderColor,
        }}>
          <Ionicons name="cart-outline" size={32} color={textSecondary} />
          <Text style={{ color: textSecondary, fontWeight: "700", marginTop: 10 }}>Sin consumos</Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {grouped.map((det, index) => (
            <View
              key={index}
              style={{
                backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                borderRadius: 24, padding: 18, borderWidth: 1, borderColor,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={{
                  backgroundColor: accentColor + "15", paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 12, borderWidth: 1, borderColor: accentColor + "20",
                }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: accentColor }}>
                    CANT: {det.cantidad}
                  </Text>
                </View>
                {det.added_by && (
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    backgroundColor: isDark ? "#262626" : "#F3F4F6",
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
                  }}>
                    {det.added_by_foto ? (
                      <Image source={{ uri: `${BASE_URL}/img/users/${det.added_by_foto}` }} style={{ width: 22, height: 22, borderRadius: 11 }} />
                    ) : (
                      <Ionicons name="person-circle" size={18} color={accentColor} />
                    )}
                    <Text style={{ fontSize: 12, color: textPrimary, fontWeight: "800" }}>Vía: {det.added_by}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
