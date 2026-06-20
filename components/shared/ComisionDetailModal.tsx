import { Ionicons } from '@expo/vector-icons';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface ComisionDetailModalProps {
    visible: boolean;
    loading: boolean;
    selectedItem: any;
    accentColor: string;
    textPrimary: string;
    textSecondary: string;
    cardBg: string;
    borderColor: string;
    onClose: () => void;
}

export function ComisionDetailModal({
    visible,
    loading,
    selectedItem,
    accentColor,
    textPrimary,
    textSecondary,
    cardBg,
    borderColor,
    onClose,
}: ComisionDetailModalProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Detalles</Text>
                            <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                                Código: {selectedItem?.codigo || selectedItem?.codigo_venta || '---'}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={textPrimary} />
                        </Pressable>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                        {loading ? (
                            <View style={styles.detailLoadingBox}>
                                <ActivityIndicator size="large" color={accentColor} />
                                <Text style={{ color: textSecondary, marginTop: 15 }}>Cargando detalles...</Text>
                            </View>
                        ) : (
                            <View style={[styles.infoCard, { borderColor, backgroundColor: cardBg }]}>
                                <Text style={[styles.cardTitle, { color: textSecondary }]}>DATOS DE LA COMISIÓN</Text>
                                <View style={styles.infoRow}>
                                    <Text style={{ color: textSecondary }}>Cliente:</Text>
                                    <Text style={{ color: textPrimary, fontWeight: '700' }}>{selectedItem?.cliente_nombre || 'Particular'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={{ color: textSecondary }}>Lugar:</Text>
                                    <Text style={{ color: textPrimary, fontWeight: '700' }}>{selectedItem?.habitacion_nombre || 'Barra'}</Text>
                                </View>
                                {selectedItem?.productos && (
                                    <View style={{ marginTop: 15 }}>
                                        <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '800', marginBottom: 5 }}>PRODUCTOS:</Text>
                                        {(typeof selectedItem.productos === 'string' ? JSON.parse(selectedItem.productos) : selectedItem.productos).map((p: any, i: number) => (
                                            <Text key={i} style={{ color: textPrimary, fontSize: 13 }}>• {p.cantidad}x {p.nombre}</Text>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                    <Pressable onPress={onClose} style={[styles.closeModalBtn, { backgroundColor: accentColor }]}>
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>Cerrar</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: '85%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    modalHeader: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    modalSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    closeBtn: { padding: 4 },
    detailLoadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    infoCard: { padding: 16, borderRadius: 20, borderWidth: 1 },
    cardTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    closeModalBtn: {
        height: 54,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
});
