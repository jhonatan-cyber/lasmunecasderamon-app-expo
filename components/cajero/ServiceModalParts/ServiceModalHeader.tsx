import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import { styles } from "../ServiceModal.styles";

interface ServiceModalHeaderProps {
  codigo: string;
  accentColor: string;
  accentBg: string;
  textPrimary: string;
  textSecondary: string;
}

export function ServiceModalHeader({
  codigo,
  accentColor,
  accentBg,
  textPrimary,
  textSecondary,
}: ServiceModalHeaderProps) {
  return (
    <View style={styles.modalHeaderRow}>
      <View style={[styles.iconBox, { backgroundColor: accentBg }]}>
        <Ionicons name="receipt-outline" size={24} color={accentColor} />
      </View>
      <View>
        <Text style={[styles.modalTitleText, { color: textPrimary }]}>
          Detalle de Servicio
        </Text>
        <Text style={[styles.modalSubText, { color: textSecondary }]}>
          Codigo : {codigo}
        </Text>
      </View>
    </View>
  );
}
