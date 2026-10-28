import { Text, View } from "react-native";
import { styles } from "../EditServiceModal.styles";

interface EditServiceInfoBoxProps {
  roomName?: string;
  clienteNombre?: string;
  anfitrionas?: string;
  precioHabitacionSinComision: number;
  textPrimary: string;
  textSecondary: string;
}

export function EditServiceInfoBox({
  roomName,
  clienteNombre,
  anfitrionas,
  precioHabitacionSinComision,
  textPrimary,
  textSecondary,
}: EditServiceInfoBoxProps) {
  const valueStyle = { color: textPrimary, fontWeight: "bold" as const };

  return (
    <View style={styles.infoBox}>
      <Text style={[styles.infoLabel, { color: textSecondary }]}>
        Habitación: <Text style={valueStyle}>{roomName}</Text>
      </Text>
      <Text style={[styles.infoLabel, { color: textSecondary }]}>
        Cliente: <Text style={valueStyle}>{clienteNombre}</Text>
      </Text>
      <Text style={[styles.infoLabel, { color: textSecondary }]}>
        Anfitrionas actuales: <Text style={valueStyle}>{anfitrionas}</Text>
      </Text>
      <Text style={[styles.infoLabel, { color: textSecondary }]}>
        Precio habitación:{" "}
        <Text style={valueStyle}>
          ${(precioHabitacionSinComision || 0).toLocaleString("es-CL")}
        </Text>
        {precioHabitacionSinComision === 0 && (
          <Text style={{ color: "#EF4444", fontSize: 11 }}>
            {" "}
            (No encontrado)
          </Text>
        )}
      </Text>
    </View>
  );
}
