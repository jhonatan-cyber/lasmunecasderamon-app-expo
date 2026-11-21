import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Client } from '@/hooks/useClientes';
import { useRenderCount } from '@/hooks/useRenderCount';
import { FontFamily, TabularNumbers } from '@/constants/fonts';
import { FontSize, HitSlop, BorderRadius } from '@/constants/spacing';
import { haptic } from '@/utils/haptics';

interface ClientCardProps {
    item: Client;
    isDark: boolean;
    isTablet: boolean;
    textPrimary: string;
    textSecondary: string;
    handleOpenHistory: (client: Client) => void;
    handleOpenLoad: (client: Client) => void;
    handleOpenEdit: (client: Client) => void;
    confirmDelete: (client: Client) => void;
}

// La búsqueda reordena y filtra la lista con las mismas referencias de cliente:
// sin `memo`, cada tecla repintaba todas las tarjetas visibles.
export const ClientCard = memo(function ClientCard({
    item,
    isDark,
    isTablet,
    textPrimary,
    textSecondary,
    handleOpenHistory,
    handleOpenLoad,
    handleOpenEdit,
    confirmDelete
}: ClientCardProps) {
    useRenderCount('ClientCard', { clientId: item.id, saldo: item.saldo });
    const bg = isDark ? "#1A1A1A" : "#FFFFFF";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

    return (
        <View style={[
            styles.clientCard,
            !isTablet && styles.clientCardMobile,
            { backgroundColor: bg, borderColor },
            isDark && styles.clientCardNeon,
        ]}>
            <View style={styles.cardHeader}>
                {}
                <View style={styles.clientInfoMain}>
                    <View style={styles.textContainer}>
                        <Text style={[styles.clientName, { color: textPrimary }]} numberOfLines={1}>
                            {item.name} {item.lastName}
                        </Text>
                        
                        <View style={styles.metadataArea}>
                            <View style={styles.infoRowSmall}>
                                <Ionicons name="card-outline" size={13} color={textSecondary} />
                                <Text style={[styles.clientSub, { color: textSecondary }]} numberOfLines={1}>
                                    {item.run || "Sin RUN"}
                                </Text>
                            </View>
                            <View style={styles.infoRowSmall}>
                                <Ionicons name="call-outline" size={13} color={textSecondary} />
                                <Text style={[styles.clientSub, { color: textSecondary }]} numberOfLines={1}>
                                    {item.phone || "Sin Teléfono"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.statusArea}>
                        <View style={[styles.balancePill, { 
                            backgroundColor: item.saldo > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(155,155,155,0.05)', 
                            borderColor: item.saldo > 0 ? '#10B98130' : 'transparent' 
                        }]}>
                            <Ionicons name="wallet-outline" size={14} color={item.saldo > 0 ? '#10B981' : textSecondary} />
                            <View>
                                <Text style={[styles.pillLabel, { color: isDark ? '#FFFFFF' : '#111827' }]}>SALDO</Text>
                                <Text style={[styles.balanceValue, { color: item.saldo > 0 ? '#10B981' : textPrimary }]}>
                                    ${(Number(item.saldo) || 0).toLocaleString()}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.balancePill, { 
                            backgroundColor: Number(item.deuda) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(155,155,155,0.05)', 
                            borderColor: Number(item.deuda) > 0 ? 'rgba(239, 68, 68, 0.2)' : 'transparent' 
                        }]}>
                            <Ionicons 
                                name="alert-circle-outline" 
                                size={14} 
                                color={Number(item.deuda) > 0 ? '#EF4444' : textSecondary} 
                            />
                            <View>
                                <Text style={[styles.pillLabel, { color: Number(item.deuda) > 0 ? '#EF4444' : textSecondary }]}>DEUDA</Text>
                                <Text style={[styles.balanceValue, { color: Number(item.deuda) > 0 ? '#EF4444' : textPrimary }]}>
                                    ${(Number(item.deuda) || 0).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.cardActionsSidebar}>
                    <Pressable
                        onPress={() => {
                            haptic.tap();
                            handleOpenHistory(item);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver historial de ${item.name}`}
                        accessibilityHint="Muestra el historial de ventas"
                        hitSlop={HitSlop.sm}
                    >
                        {({ pressed }) => (
                            <View style={[styles.actionBtn, { backgroundColor: 'rgba(168, 85, 247, 0.1)', opacity: pressed ? 0.85 : 1 }]}>
                                <Ionicons name="eye-outline" size={22} color="#A855F7" />
                            </View>
                        )}
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            haptic.tap();
                            handleOpenLoad(item);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Cargar saldo a ${item.name}`}
                        accessibilityHint="Abre el formulario para cargar saldo"
                        hitSlop={HitSlop.sm}
                    >
                        {({ pressed }) => (
                            <View style={[styles.actionBtn, { backgroundColor: '#10B981', opacity: pressed ? 0.85 : 1 }]}>
                                <Ionicons name="wallet" size={22} color="#FFFFFF" />
                            </View>
                        )}
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            haptic.tap();
                            handleOpenEdit(item);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Editar ${item.name}`}
                        accessibilityHint="Abre el formulario de edición"
                        hitSlop={HitSlop.sm}
                    >
                        {({ pressed }) => (
                            <View style={[styles.actionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)', opacity: pressed ? 0.85 : 1 }]}>
                                <Ionicons name="create-outline" size={22} color="#3B82F6" />
                            </View>
                        )}
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            haptic.tap();
                            confirmDelete(item);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar ${item.name}`}
                        accessibilityHint="Confirma la eliminación del cliente"
                        hitSlop={HitSlop.sm}
                    >
                        {({ pressed }) => (
                            <View style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)', opacity: pressed ? 0.85 : 1 }]}>
                                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    clientCard: {
        flex: 1,
        padding: 10,
        paddingRight: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
        marginHorizontal: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    clientCardNeon: {
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    clientCardMobile: {
        flex: undefined,
        width: '100%',
        marginHorizontal: 0,
        paddingRight: 10,
    },
    cardHeader: { 
        flexDirection: 'row', 
        alignItems: 'stretch', 
        flex: 1 
    },
    clientInfoMain: { 
        flex: 1, 
        paddingRight: 4 
    },
    textContainer: { 
        flex: 1, 
        justifyContent: 'flex-start' 
    },
    metadataArea: { 
        marginTop: 8, 
        gap: 4 
    },
    infoRowSmall: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6 
    },
    clientName: {
        fontSize: FontSize.sm,
        fontFamily: FontFamily.bold,
        letterSpacing: -0.2
    },
    clientSub: {
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        opacity: 0.75
    },
    statusArea: { 
        marginTop: 12, 
        gap: 8 
    },
    balancePill: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        alignSelf: 'stretch', 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderRadius: BorderRadius.full, 
        gap: 10,
        borderWidth: 1,
    },
    pillLabel: {
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.bold,
        letterSpacing: 0.6,
        marginBottom: -2,
        opacity: 0.7
    },
    balanceValue: {
        fontSize: FontSize.sm,
        fontFamily: FontFamily.bold,
        ...TabularNumbers
    },
    cardActionsSidebar: { 
        paddingLeft: 12, 
        borderLeftWidth: 1, 
        borderLeftColor: 'rgba(155,155,155,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14
    },
    actionBtn: { 
        width: 44, 
        height: 44, 
        borderRadius: BorderRadius.full, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
});
