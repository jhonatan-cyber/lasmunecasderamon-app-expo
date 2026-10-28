import { Pressable, Text } from "react-native";
import { AnimatedView } from "@/components/ui/AnimatedView";
import { styles } from "../HomeScreen.styles";

interface SelectedEventsBarProps {
  count: number;
  cardBg: string;
  accentColor: string;
  textPrimary: string;
  onOpenDetails: () => void;
}

export function SelectedEventsBar({
  count,
  cardBg,
  accentColor,
  textPrimary,
  onOpenDetails,
}: SelectedEventsBarProps) {
  return (
    <AnimatedView
      from={{ translateY: 100 }}
      animate={{ translateY: 0 }}
      style={[styles.selectionFloat, { backgroundColor: cardBg }]}
    >
      <Text style={{ color: textPrimary, fontWeight: "700" }}>
        {count} seleccionados
      </Text>
      <Pressable
        onPress={onOpenDetails}
        style={[styles.viewBtn, { backgroundColor: accentColor }]}
      >
        <Text style={{ color: "#FFF", fontWeight: "800" }}>DETALLES</Text>
      </Pressable>
    </AnimatedView>
  );
}
