import { Pressable, Text, View } from "react-native";
import { styles } from "../AnticiposScreen.styles";
import type { FiltroAnticipos } from "./anticiposUtils";

interface AnticiposFilterRowProps {
  filter: FiltroAnticipos;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textSecondary: string;
  onChange: (filter: FiltroAnticipos) => void;
}

const FILTROS: FiltroAnticipos[] = [
  "todos",
  "pendiente",
  "aprobado",
  "rechazado",
];

export function AnticiposFilterRow({
  filter,
  accentColor,
  cardBg,
  borderColor,
  textSecondary,
  onChange,
}: AnticiposFilterRowProps) {
  return (
    <View style={styles.filterRow}>
      {FILTROS.map((f) => (
        <Pressable
          key={f}
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === f ? accentColor : cardBg,
              borderColor: filter === f ? accentColor : borderColor,
            },
          ]}
          onPress={() => onChange(f)}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === f ? "#FFFFFF" : textSecondary },
            ]}
          >
            {f === "pendiente"
              ? "Solicitados"
              : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
