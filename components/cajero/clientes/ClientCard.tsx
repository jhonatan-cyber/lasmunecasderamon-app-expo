import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '@/hooks/useClientes';

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

export function ClientCard({
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
    const bg = isDark ? "#1A1A1A" : "#FFFFFF";
    const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

    return (
        <View style={[
            styles.clientCard,
            !isTablet && styles.clientCardMobile,
            { backgroundColor: bg, borderColor }
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
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}
                        onPress={() => handleOpenHistory(item)}
                    >
                        <Ionicons name="eye-outline" size={22} color="#A855F7" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleOpenLoad(item)}
                    >
                        <Ionicons name="wallet" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
                        onPress={() => handleOpenEdit(item)}
                    >
                        <Ionicons name="create-outline" size={22} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
                        onPress={() => confirmDelete(item)}
                    >
                        <Ionicons name="trash-outline" size={22} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

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
        shadowRadius: 10 
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
        fontSize: 16, 
        fontWeight: '900', 
        letterSpacing: -0.2 
    },
    clientSub: { 
        fontSize: 11, 
        fontWeight: '700', 
        textTransform: 'uppercase', 
        opacity: 0.8 
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
        borderRadius: 14, 
        gap: 10,
        borderWidth: 1,
    },
    pillLabel: { 
        fontSize: 8, 
        fontWeight: '900', 
        letterSpacing: 0.5, 
        marginBottom: -2, 
        opacity: 0.7 
    },
    balanceValue: { 
        fontSize: 15, 
        fontWeight: '900' 
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
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
});
