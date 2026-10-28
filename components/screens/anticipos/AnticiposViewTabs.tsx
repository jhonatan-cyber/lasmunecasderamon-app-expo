import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from "react-native";
import { styles } from "../AnticiposScreen.styles";
import type { VistaAnticipos } from "./anticiposUtils";

interface AnticiposViewTabsProps {
  viewMode: VistaAnticipos;
  accentColor: string;
  cardBg: string;
  textSecondary: string;
  onChange: (mode: VistaAnticipos) => void;
}

export function AnticiposViewTabs({
  viewMode,
  accentColor,
  cardBg,
  textSecondary,
  onChange,
}: AnticiposViewTabsProps) {
  return (
    <View
      style={{ flexDirection: "row", paddingHorizontal: 16, marginTop: 16 }}
    >
      <Pressable
        style={[
          styles.mainTab,
          viewMode === "solicitudes" && {
            backgroundColor: accentColor,
            borderColor: accentColor,
          },
          {
            backgroundColor:
              viewMode !== "solicitudes" ? cardBg : accentColor,
          },
        ]}
        onPress={() => onChange("solicitudes")}
      >
        <Ionicons
          name="document-text-outline"
          size={18}
          color={viewMode === "solicitudes" ? "#FFFFFF" : textSecondary}
        />
        <Text
          style={[
            styles.mainTabText,
            { color: viewMode === "solicitudes" ? "#FFFFFF" : textSecondary },
          ]}
        >
          Solicitudes
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.mainTab,
          viewMode === "anticipos" && {
            backgroundColor: accentColor,
            borderColor: accentColor,
          },
          {
            backgroundColor: viewMode !== "anticipos" ? cardBg : accentColor,
          },
        ]}
        onPress={() => onChange("anticipos")}
      >
        <Ionicons
          name="cash-outline"
          size={18}
          color={viewMode === "anticipos" ? "#FFFFFF" : textSecondary}
        />
        <Text
          style={[
            styles.mainTabText,
            { color: viewMode === "anticipos" ? "#FFFFFF" : textSecondary },
          ]}
        >
          Historial
        </Text>
      </Pressable>
    </View>
  );
}
