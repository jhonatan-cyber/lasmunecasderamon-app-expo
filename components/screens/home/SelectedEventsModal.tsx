import Ionicons from "@expo/vector-icons/Ionicons";
import { FlatList, Pressable, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { formatCurrency } from "@/utils/format";
import { styles } from "../HomeScreen.styles";
import { getEventLabel } from "./eventLabels";

interface SelectedEventsModalProps {
  visible: boolean;
  events: any[];
  bg: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  accentColor: string;
  onClose: () => void;
  onSelect: (event: any) => void;
}

export function SelectedEventsModal({
  visible,
  events,
  bg,
  cardBg,
  borderColor,
  textPrimary,
  accentColor,
  onClose,
  onSelect,
}: SelectedEventsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              Eventos
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={28} color={textPrimary} />
            </Pressable>
          </View>
          <FlatList<any>
            data={events}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                style={[
                  styles.eventItem,
                  { backgroundColor: cardBg, borderColor },
                ]}
              >
                <Text style={{ color: textPrimary, fontWeight: "700" }}>
                  {getEventLabel(item)}
                </Text>
                <Text style={{ color: accentColor, fontWeight: "900" }}>
                  {formatCurrency(item.amount)}
                </Text>
              </Pressable>
            )}
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
      </View>
    </Modal>
  );
}
