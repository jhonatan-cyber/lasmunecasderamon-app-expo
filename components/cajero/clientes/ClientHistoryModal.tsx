import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Client } from '@/hooks/useClientes';
import { useAccentColor } from '@/hooks/useAccentColor';
import { HistorySummaryCards } from './HistorySummaryCards';
import { HistoryEmptyState } from './HistoryEmptyState';
import { HistoryItemCard } from './HistoryItemCard';

interface ClientHistoryModalProps {
    visible: boolean;
    editingClient: Client | null;
    isDark: boolean;
    insets: { bottom: number };
    historyLoading: boolean;
    historyData: any[];
    refreshingHistory: boolean;
    accentColor: string;
    textPrimary: string;
    textSecondary: string;
    fetchHistory: (clientId: string | number) => Promise<void>;
    setRefreshingHistory: (val: boolean) => void;
    onClose: () => void;
}

export function ClientHistoryModal({
    visible,
    editingClient,
    isDark,
    insets,
    historyLoading,
    historyData,
    refreshingHistory,
    accentColor,
    textPrimary,
    textSecondary,
    fetchHistory,
    setRefreshingHistory,
    onClose
}: ClientHistoryModalProps) {
    const { cardBg, textPrimary: themePrimary, textSecondary: themeSecondary, accentText } = useAccentColor();
    const totalServicios = historyData
        .filter((i: any) => i.category === 'SERVICIO')
        .reduce((a: number, i: any) => a + Number(i.monto || 0), 0);
    const totalConsumo = historyData
        .filter((i: any) => i.category === 'CONSUMO')
        .reduce((a: number, i: any) => a + Number(i.monto || 0), 0);
    const totalCargas = historyData
        .filter((i: any) => i.category === 'CARGA')
        .reduce((a: number, i: any) => a + Number(i.monto || 0), 0);

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, {
                    backgroundColor: cardBg,
                    height: '83%',
                    paddingBottom: Math.max(insets.bottom, 20)
                }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: themePrimary }]}>Historial de Cuenta</Text>
                            <Text style={{ color: themeSecondary, fontFamily: FontFamily.bold }}>
                                {editingClient?.name} {editingClient?.lastName}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar historial de cuenta">
                            <Ionicons name="close" size={26} color={themePrimary} />
                        </Pressable>
                    </View>

                    {historyLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={accentColor} />
                            <Text style={{ marginTop: 10, color: themeSecondary }}>Cargando movimientos...</Text>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshingHistory}
                                    onRefresh={() => {
                                        if (editingClient) {
                                            setRefreshingHistory(true);
                                            fetchHistory(editingClient.id);
                                        }
                                    }}
                                    tintColor={accentColor}
                                />
                            }
                        >
                            {historyData.length > 0 && (
                                <HistorySummaryCards
                                    totalServicios={totalServicios}
                                    totalConsumo={totalConsumo}
                                    totalCargas={totalCargas}
                                />
                            )}

                            {historyData.length === 0 ? (
                                <HistoryEmptyState textSecondary={themeSecondary} />
                            ) : (
                                historyData.map((item: any, index: number) => (
                                    <HistoryItemCard
                                        key={`${item.id}-${index}`}
                                        item={item}
                                        index={index}
                                        isDark={isDark}
                                        textPrimary={themePrimary}
                                        textSecondary={themeSecondary}
                                    />
                                ))
                            )}
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: accentColor, marginTop: 10 }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.saveBtnText, { color: accentText }]}>CERRAR</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontFamily: FontFamily.black },
    saveBtn: { height: 56, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveBtnText: { fontSize: 15, fontFamily: FontFamily.black, letterSpacing: 1 },
});
