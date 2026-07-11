import { Ionicons } from '@expo/vector-icons';
import { FlatList } from 'react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface EventSelectionModalProps {
    visible: boolean;
    selectedEvents: any[];
    cardBg: string;
    bg: string;
    textPrimary: string;
    textSecondary: string;
    accentColor: string;
    borderColor: string;
    onClose: () => void;
    onSelectEvent: (item: any) => void;
    getEventLabel: (item: any) => string;
    formatCurrency: (amount: number) => string;
}

export function EventSelectionModal({
    visible,
    selectedEvents,
    cardBg,
    bg,
    textPrimary,
    accentColor,
    borderColor,
    onClose,
    onSelectEvent,
    getEventLabel,
    formatCurrency,
}: EventSelectionModalProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: bg }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Eventos</Text>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={28} color={textPrimary} />
                        </Pressable>
                    </View>
                    <FlatList<any>
                        data={selectedEvents}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => onSelectEvent(item)}
                                style={[styles.eventItem, { backgroundColor: cardBg, borderColor }]}
                            >
                                <Text style={{ color: textPrimary, fontWeight: '700' }}>
                                    {getEventLabel(item)}
                                </Text>
                                <Text style={{ color: accentColor, fontWeight: '900' }}>
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

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '80%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    modalHeader: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    eventItem: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});
