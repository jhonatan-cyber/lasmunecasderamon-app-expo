import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

const statusColors: Record<number, string> = {
  0: "#10B981",
  1: "#fa2828ff",
  2: "#F59E0B",
  3: "#6B7280",
  4: "#FB923C",
};

const statusLabels: Record<number, string> = {
  0: "Cobrado",
  1: "Pendiente",
  2: "Solicitud Anul.",
  3: "Anulado",
  4: "Anul. Parcial",
};

interface Props {
  estado: number;
  codigo: string | number;
  textPrimary: string;
  textSecondary: string;
  onClose: () => void;
  styles: Record<string, any>;
}

export default function CuentaDetailHeader({ estado, codigo, textPrimary, textSecondary, onClose, styles }: Props) {
  return (
    <View style={styles.modalHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalle de Cuenta</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: statusColors[Number(estado)] || "#6B7280",
            }}
          />
          <Text style={[styles.modalSubText, { color: textSecondary, fontWeight: "800" }]}>
            {statusLabels[Number(estado)] || "Desconocido"} • #{codigo}
          </Text>
        </View>
      </View>
      <Pressable onPress={onClose} style={{ padding: 8 }}>
        <Ionicons name="close-circle" size={32} color={textSecondary} />
      </Pressable>
    </View>
  );
}
