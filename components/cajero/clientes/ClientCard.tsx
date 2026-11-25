import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Client } from '@/hooks/useClientes';
import { useRenderCount } from '@/hooks/useRenderCount';
import { FontFamily, TabularNumbers } from '@/constants/fonts';
import { FontSize, HitSlop, BorderRadius } from '@/constants/spacing';
import { haptic } from '@/utils/haptics';
import { useAccentColor } from '@/hooks/useAccentColor';

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
    const { cardBg, borderColor: themeBorderColor, accentOnSurface, accentColor, accentUi, accentBg } = useAccentColor();
    useRenderCount('ClientCard', { clientId: item.id, saldo: item.saldo });
    const hasSaldo = Number(item.saldo) > 0;
    const saldoColor = accentOnSurface;

    return (
        <View style={[
            styles.clientCard,
            !isTablet && styles.clientCardMobile,
            { backgroundColor: cardBg, borderColor: themeBorderColor },
            isDark && styles.clientCardNeon,
        ]}>
            <View style={styles.cardContent}>
                {/* Info + Balance section */}
                <View style={styles.infoRow}>
                    <View style={styles.infoMain}>
                        <Text style={[styles.clientName, { color: textPrimary }]} numberOfLines={1}>
                            {item.name} {item.lastName}
                        </Text>
                        <View style={styles.metadataRow}>
                            {item.run ? (
                                <View style={styles.metadataItem}>
                                    <Ionicons name="card-outline" size={11} color={textSecondary} />
                                    <Text style={[styles.metadataText, { color: textSecondary }]} numberOfLines={1}>
                                        {item.run}
                                    </Text>
                                </View>
                            ) : null}
                            {item.phone ? (
                                <View style={styles.metadataItem}>
                                    <Ionicons name="call-outline" size={11} color={textSecondary} />
                                    <Text style={[styles.metadataText, { color: textSecondary }]} numberOfLines={1}>
                                        {item.phone}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                    <View style={[styles.balancePill, {
                        backgroundColor: hasSaldo ? `${saldoColor}1A` : 'rgba(155,155,155,0.05)',
                    }]}>
                        <Ionicons name="wallet-outline" size={14} color={hasSaldo ? saldoColor : textSecondary} />
                        <View>
                            <Text style={[styles.pillLabel, { color: textSecondary }]}>SALDO</Text>
                            <Text style={[styles.balanceValue, { color: hasSaldo ? saldoColor : textPrimary }]}>
                                ${(Number(item.saldo) || 0).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Actions section */}
                <View style={[styles.actionsRow, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    <Pressable
                        onPress={() => { haptic.tap(); handleOpenHistory(item); }}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver historial de ${item.name}`}
                        accessibilityHint="Muestra el historial de ventas"
                        hitSlop={HitSlop.sm}
                    >
                        {({ pressed }) => (
                            <View style={[styles.actionBtn, { backgroundColor: `${accentUi}1A`, opacity: pressed ? 0.7 : 1 }]}>
                                <Ionicons name="eye-outline" size={16} color={accentUi} />
                                <Text style={[styles.actionLabel, { color: accentUi }]}>Historial</Text>
                            </View>
                        )}
                    </Pressable>
                    <Pressable
                        onPress={() => { haptic.tap(); handleOpenLoad(item); }}
                        accessibilityRole="button"
                        accessibilityLabel={`Cargar saldo a ${item.name}`}
                        accessibilityHint="Abre el formulario para cargar saldo"
                        hitSlop={HitSlop.sm}
                    >
                        {({ pressed }) => (
                            <View style={[styles.actionBtn, { backgroundColor: `${saldoColor}1A`, opacity: pressed ? 0.7 : 1 }]}>
                                <Ionicons name="wallet" size={16} color={saldoColor} />
                                <Text style={[styles.actionLabel, { color: saldoColor }]}>Cargar</Text>
                            </View>
                        )}
                    </Pressable>
                    <Pressable
                        onPress={() => { haptic.tap(); handleOpenEdit(item); }}
                        accessibilityRole="button"
                        accessibilityLabel={`Editar ${item.name}`}
                        accessibilityHint="Abre el formulario de edición"
                        hitSlop={HitSlop.sm}
                    >
                        {({ pressed }) => (
                            <View style={[styles.actionBtn, { backgroundColor: `${accentColor}1A`, opacity: pressed ? 0.7 : 1 }]}>
                                <Ionicons name="create-outline" size={16} color={accentColor} />
                                <Text style={[styles.actionLabel, { color: accentOnSurface }]}>Editar</Text>
                            </View>
                        )}
                    </Pressable>
                    <Pressable
                        onPress={() => { haptic.tap(); confirmDelete(item); }}
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar ${item.name}`}
                        accessibilityHint="Confirma la eliminación del cliente"
                        hitSlop={HitSlop.sm}
                    >
                        {({ pressed }) => (
                            <View style={[styles.actionBtn, { backgroundColor: accentBg, opacity: pressed ? 0.7 : 1 }]}>
                                <Ionicons name="trash-outline" size={16} color={accentColor} />
                                <Text style={[styles.actionLabel, { color: accentOnSurface }]}>Eliminar</Text>
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
        padding: 12,
        borderRadius: BorderRadius.card,
        borderWidth: 1,
        marginBottom: 10,
        marginHorizontal: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    clientCardNeon: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    clientCardMobile: {
        flex: undefined,
        width: '100%',
        marginHorizontal: 0,
    },
    cardContent: {
        flex: 1,
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoMain: {
        flex: 1,
        minWidth: 0,
    },
    clientName: {
        fontSize: FontSize.sm,
        fontFamily: FontFamily.bold,
        letterSpacing: -0.2,
        marginBottom: 2,
    },
    metadataRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    metadataItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    metadataText: {
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.medium,
        opacity: 0.75,
    },
    balancePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        gap: 6,
    },
    pillLabel: {
        fontSize: 9,
        fontFamily: FontFamily.bold,
        letterSpacing: 0.6,
        marginBottom: -1,
        opacity: 0.7,
    },
    balanceValue: {
        fontSize: FontSize.xs,
        fontFamily: FontFamily.bold,
        ...TabularNumbers,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        gap: 6,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: BorderRadius.md,
        gap: 4,
    },
    actionLabel: {
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.semibold,
    },
});
