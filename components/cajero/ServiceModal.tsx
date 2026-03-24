import React from 'react';
import { View, Text, Modal, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '@/components/ui/Skeleton';

interface ServiceModalProps {
    visible: boolean;
    onClose: () => void;
    selectedService: any;
    selectedClient: any;
    loadingClient?: boolean;
    metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago' | '';
    setMetodoPago: (m: 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago' | '') => void;
    metodoPagoAdicional: 'efectivo' | 'tarjeta' | 'transferencia' | '';
    setMetodoPagoAdicional: (m: 'efectivo' | 'tarjeta' | 'transferencia' | '') => void;
    allHostesses: any[];
    onAprobar: (id: string, tipo: string) => void;
    isDark: boolean;
    isTablet: boolean;
    accentColor: string;
    accentBg: string;
    accentBorder: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
    cardBg: string;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
    visible,
    onClose,
    selectedService,
    selectedClient,
    loadingClient,
    metodoPago,
    setMetodoPago,
    metodoPagoAdicional,
    setMetodoPagoAdicional,
    allHostesses,
    onAprobar,
    isDark,
    isTablet,
    accentColor,
    accentBg,
    accentBorder,
    textPrimary,
    textSecondary,
    borderColor,
    cardBg
}) => {
    if (!selectedService) return null;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.checkoutModal, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.modalHeaderRow}>
                        <View style={[styles.iconBox, { backgroundColor: accentBg }]}>
                            <Ionicons name="receipt-outline" size={24} color={accentColor} />
                        </View>
                        <View>
                            <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalle de Servicio</Text>
                            <Text style={[styles.modalSubText, { color: textSecondary }]}>Codigo : {selectedService.codigo || '#' + selectedService.id_solicitud}</Text>
                        </View>
                    </View>

                    <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                        <View style={styles.optionsTitleContainer}>
                            <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: isTablet ? 18 : 13 }]}>Información</Text>
                        </View>

                        <View style={[styles.infoRow, { marginBottom: 12 }]}>
                            <Ionicons name="bed-outline" size={isTablet ? 24 : 20} color={accentColor} />
                            <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>Habitación: {selectedService.habitacion_nombre}</Text>
                        </View>
                        <View style={[styles.infoRow, { marginBottom: 12 }]}>
                            <Ionicons name="timer-outline" size={isTablet ? 24 : 20} color={accentColor} />
                            <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>Tiempo: {selectedService.tiempo || selectedService.time || 0} min</Text>
                        </View>
                        <View style={[styles.infoRow, { marginBottom: 12 }]}>
                            <Ionicons name="person-outline" size={isTablet ? 24 : 20} color={accentColor} />
                            <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>Solicitado por: {selectedService.solicitado_por_nombre}</Text>
                        </View>
                        <View style={[styles.infoRow, { marginBottom: 8 }]}>
                            <Ionicons name="people-outline" size={isTablet ? 24 : 20} color={accentColor} />
                            <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>Anfitrionas ({selectedService.anfitrionas_ids?.length || 0}):</Text>
                        </View>
                        <View style={{ marginLeft: 8, marginBottom: 16 }}>
                            {(() => {
                                const anfsIds = Array.isArray(selectedService.anfitrionas_ids) ? selectedService.anfitrionas_ids : [];
                                const numAnfs = anfsIds.length || 1;
                                const comisionIndividual = (selectedService.comision_anfitriona || 0) > 0
                                    ? Math.floor(selectedService.comision_anfitriona / numAnfs)
                                    : Math.floor(selectedService.precio_servicio || 0);

                                const displayAnfs = (Array.isArray(selectedService.anfitrionas_con_nicks) && selectedService.anfitrionas_con_nicks.length > 0)
                                    ? selectedService.anfitrionas_con_nicks
                                    : anfsIds.map((id: any) => {
                                        const found = allHostesses.find(h => String(h.id_usuario || h.id) === String(id));
                                        return found ? found : { id, nick: `ID: ${id}`, nombre: 'Anfitriona', apellido: '' };
                                    });

                                return displayAnfs.length > 0 ? (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isTablet ? 12 : 8 }}>
                                        {displayAnfs.map((anf: any, idx: number) => (
                                            <View key={idx} style={{
                                                backgroundColor: accentBg,
                                                paddingHorizontal: isTablet ? 16 : 12,
                                                paddingVertical: isTablet ? 12 : 8,
                                                borderRadius: 14,
                                                borderWidth: 1,
                                                borderColor: accentBorder,
                                                flexDirection: 'row',
                                                alignItems: 'center'
                                            }}>
                                                <View>
                                                    <Text style={{ color: textPrimary, fontSize: isTablet ? 16 : 13, fontWeight: '800' }}>{anf.nick || anf.nombre}</Text>
                                                    <Text style={{ color: '#10B981', fontSize: isTablet ? 15 : 12, fontWeight: '900' }}>+ ${comisionIndividual.toLocaleString('de-DE')}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={{ color: textSecondary, fontSize: isTablet ? 16 : 13, fontStyle: 'italic' }}>No hay información de anfitrionas</Text>
                                );
                            })()}
                        </View>

                        <View style={[styles.infoRow, { marginBottom: 12 }]}>
                            <Ionicons name="card-outline" size={isTablet ? 24 : 20} color={accentColor} />
                            <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>
                                Método Pago: {(metodoPago || selectedService.metodo_pago).toUpperCase()}
                            </Text>
                        </View>

                        {loadingClient ? (
                            <View style={{ marginBottom: 15, padding: 12, borderRadius: 12, backgroundColor: accentBg, borderWidth: 1, borderColor: accentBorder }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Skeleton width={32} height={32} borderRadius={16} />
                                        <View style={{ gap: 4 }}>
                                            <Skeleton width={100} height={14} />
                                            <Skeleton width={60} height={10} />
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <Skeleton width={80} height={10} />
                                        <Skeleton width={60} height={18} />
                                    </View>
                                </View>
                            </View>
                        ) : selectedClient && (
                            <View style={{ marginBottom: 15, padding: 12, borderRadius: 12, backgroundColor: accentBg, borderWidth: 1, borderColor: accentBorder }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${accentColor}20`, alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name="person" size={18} color={accentColor} />
                                        </View>
                                        <View style={{ marginLeft: 10 }}>
                                            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 13 }}>{selectedClient.nombre} {selectedClient.apellido}</Text>
                                            <Text style={{ color: textSecondary, fontSize: 10 }}>Cliente frecuente</Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '800' }}>SALDO DISPONIBLE</Text>
                                        <Text style={{ color: Number(selectedClient.saldo) > 0 ? '#10B981' : textSecondary, fontSize: 16, fontWeight: '900' }}>
                                            ${Number(selectedClient.saldo || 0).toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {selectedClient && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }]}>MODIFICAR MÉTODO DE PAGO</Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    {['efectivo', 'tarjeta', 'transferencia', 'prepago'].map((m) => {
                                        const isSelected = (metodoPago || selectedService.metodo_pago) === m;
                                        const isLockedPrepago = m !== 'prepago' && Number(selectedClient?.saldo || 0) > 0;
                                        
                                        return (
                                            <Pressable
                                                key={m}
                                                onPress={() => {
                                                    if (isLockedPrepago) return;
                                                    setMetodoPago(m as any);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    paddingVertical: 10,
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: isSelected ? accentColor : borderColor,
                                                    backgroundColor: isSelected ? `${accentColor}15` : 'transparent',
                                                    alignItems: 'center',
                                                    opacity: isLockedPrepago ? 0.4 : 1
                                                }}
                                            >
                                                <Ionicons 
                                                    name={m === 'efectivo' ? 'cash' : m === 'tarjeta' ? 'card' : m === 'prepago' ? 'wallet' : 'swap-horizontal'} 
                                                    size={16} 
                                                    color={isSelected ? accentColor : textSecondary} 
                                                />
                                                <Text style={{ color: isSelected ? accentColor : textSecondary, fontSize: 9, fontWeight: '800', marginTop: 4 }}>{m.toUpperCase()}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {selectedClient && (metodoPago === 'prepago' || (!metodoPago && selectedService.metodo_pago === 'prepago')) && (() => {
                            const subtotal = Math.floor((selectedService.precio_servicio || 0) * (selectedService.anfitrionas_ids?.length || 1)) + Math.floor(selectedService.precio_habitacion || 0) + Math.floor(selectedService.iva || 0);
                            const saldo = Number(selectedClient.saldo || 0);
                            const prepago = Math.min(subtotal, saldo);
                            const restante = Math.max(0, subtotal - saldo);
                            
                            if (restante > 0) {
                                return (
                                    <View style={{ marginBottom: 20, padding: 12, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: accentColor }}>
                                        <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '800', marginBottom: 8 }}>RESTANTE A PAGAR: ${restante.toLocaleString()}</Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {['efectivo', 'tarjeta', 'transferencia'].map((m) => (
                                                <Pressable
                                                    key={m}
                                                    onPress={() => setMetodoPagoAdicional(m as any)}
                                                    style={{
                                                        flex: 1,
                                                        paddingVertical: 8,
                                                        borderRadius: 10,
                                                        borderWidth: 1,
                                                        borderColor: metodoPagoAdicional === m ? accentColor : borderColor,
                                                        backgroundColor: metodoPagoAdicional === m ? `${accentColor}10` : 'transparent',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Text style={{ color: metodoPagoAdicional === m ? accentColor : textSecondary, fontSize: 9, fontWeight: '800' }}>{m.toUpperCase()}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                );
                            }
                            return null;
                        })()}

                        <View style={[styles.receiptContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor, marginTop: 10, padding: isTablet ? 24 : 16 }]}>
                            <View style={styles.productDetailRow}>
                                <View style={styles.productInfoCol}>
                                    <Text style={[styles.productName, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>Precio Servicio</Text>
                                </View>
                                <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>${Math.floor((selectedService.precio_servicio || 0) * (selectedService.anfitrionas_ids?.length || 1)).toLocaleString('de-DE')}</Text>
                            </View>
                            <View style={styles.productDetailRow}>
                                <View style={styles.productInfoCol}>
                                    <Text style={[styles.productName, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>Precio Habitación</Text>
                                </View>
                                <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>${Math.floor(selectedService.precio_habitacion || 0).toLocaleString('de-DE')}</Text>
                            </View>
                            {(selectedService.iva || 0) > 0 && (
                                <View style={styles.productDetailRow}>
                                    <View style={styles.productInfoCol}>
                                        <Text style={[styles.productName, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>IVA / Ajuste Tarjeta</Text>
                                    </View>
                                    <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: isTablet ? 18 : 15 }]}>${Math.floor(selectedService.iva || 0).toLocaleString('de-DE')}</Text>
                                </View>
                            )}
                            <View style={[styles.productDetailRow, { borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginTop: 8, paddingTop: 12 }]}>
                                <View style={styles.productInfoCol}>
                                    <Text style={[styles.productName, { color: textPrimary, fontWeight: '800', fontSize: isTablet ? 22 : 16 }]}>TOTAL</Text>
                                </View>
                                <Text style={[styles.productSubtotal, { color: accentColor, fontSize: isTablet ? 26 : 18, fontWeight: '900' }]}>${Math.floor(selectedService.total || 0).toLocaleString('de-DE')}</Text>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalActionsRow}>
                        <Pressable
                            style={[styles.modalBtnAction, { backgroundColor: 'transparent', borderWidth: 1, borderColor: accentColor }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.modalBtnActionText, { color: textSecondary }]}>Cerrar</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.modalBtnAction, { backgroundColor: accentColor }]}
                            onPress={() => {
                                onClose();
                                onAprobar(selectedService.id_solicitud, 'solicitud');
                            }}
                        >
                            <Text style={[styles.modalBtnActionText, { color: '#FFFFFF' }]}>Aprobar Ahora</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    checkoutModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderBottomWidth: 0, minHeight: 400, maxHeight: '90%' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    modalTitleText: { fontSize: 22, fontWeight: '800' },
    modalSubText: { fontSize: 14, fontWeight: '600', marginTop: 2 },
    optionsTitleContainer: { marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 13, fontWeight: '600' },
    receiptContainer: { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
    productDetailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    productInfoCol: { flex: 1, justifyContent: 'center', paddingRight: 8 },
    productName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    productSubtotal: { fontSize: 15, fontWeight: '800' },
    modalActionsRow: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
    modalBtnAction: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    modalBtnActionText: { fontSize: 16, fontWeight: '800' },
});

