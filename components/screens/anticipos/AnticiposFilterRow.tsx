import { ScrollView, Pressable, Text } from "react-native";
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

const FILTROS: { key: FiltroAnticipos; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendiente", label: "Solicitados" },
  { key: "aprobado", label: "Aprobados" },
  { key: "rechazado", label: "Rechazados" },
  { key: "recibido", label: "Recibidos" },
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {FILTROS.map(({ key, label }) => (
        <Pressable
          key={key}
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === key ? accentColor : cardBg,
              borderColor: filter === key ? accentColor : borderColor,
            },
          ]}
          onPress={() => onChange(key)}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === key ? "#FFFFFF" : textSecondary },
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
