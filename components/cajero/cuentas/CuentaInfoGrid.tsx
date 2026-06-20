import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";
import { BASE_URL } from "@/api/client";
import { parseDateSafe } from "@/utils/timeUtils";

interface Props {
  clienteNombre: string;
  fechaCrea: string;
  habitacionNumero: string | null;
  fotoCajero: string | null;
  nombreCajero: string;
  fotoCobrador: string | null;
  nombreCobrador: string | null;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  styles: Record<string, any>;
}

function formatDate(dateStr: string) {
  const d = parseDateSafe(dateStr);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).replace(/,/g, "");
}

export default function CuentaInfoGrid({
  clienteNombre,
  fechaCrea,
  habitacionNumero,
  fotoCajero,
  nombreCajero,
  fotoCobrador,
  nombreCobrador,
  accentColor,
  textPrimary,
  textSecondary,
  styles,
}: Props) {
  return (
    <View style={[styles.infoGrid, { marginTop: 10 }]}>
      <View style={styles.gridItem}>
        <Text style={[styles.gridLabel, { color: textSecondary }]}>CLIENTE</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
          <Ionicons name="person" size={16} color={accentColor} />
          <Text style={[styles.gridValue, { color: textPrimary, fontSize: 15, fontWeight: "800" }]}>
            {clienteNombre || "Sin registrar"}
          </Text>
        </View>
      </View>

      <View style={styles.gridItem}>
        <Text style={[styles.gridLabel, { color: textSecondary }]}>FECHA Y HORA</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
          <Ionicons name="calendar" size={16} color={accentColor} />
          <Text style={[styles.gridValue, { color: textPrimary, fontWeight: "700" }]}>
            {fechaCrea ? formatDate(fechaCrea) : "-"}
          </Text>
        </View>
      </View>

      <View style={styles.gridItem}>
        <Text style={[styles.gridLabel, { color: textSecondary }]}>HABITACIÓN / SECTOR</Text>
        <Text style={[styles.gridValue, { color: textPrimary }]}>
          {habitacionNumero || "Barra / General"}
        </Text>
      </View>

      <View style={styles.gridItem}>
        <Text style={[styles.gridLabel, { color: textSecondary }]}>REGISTRADO POR</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
          {fotoCajero ? (
            <Image
              source={{ uri: `${BASE_URL}/img/users/${fotoCajero}` }}
              style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#E5E7EB" }}
            />
          ) : (
            <Ionicons name="person-circle" size={24} color={textSecondary} />
          )}
          <Text style={[styles.gridValue, { color: textPrimary }]}>{nombreCajero || "Sistema"}</Text>
        </View>
      </View>

      {nombreCobrador && (
        <View style={styles.gridItem}>
          <Text style={[styles.gridLabel, { color: "#10B981" }]}>COBRADO POR</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            {fotoCobrador ? (
              <Image
                source={{ uri: `${BASE_URL}/img/users/${fotoCobrador}` }}
                style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#E5E7EB", borderWidth: 1, borderColor: "#10B981" }}
              />
            ) : (
              <Ionicons name="person-circle" size={24} color="#10B981" />
            )}
            <Text style={[styles.gridValue, { color: "#10B981", fontWeight: "800" }]}>{nombreCobrador}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
