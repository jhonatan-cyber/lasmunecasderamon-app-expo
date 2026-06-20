import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface Totals {
    subtotal: number;
    totalComision: number;
    total: number;
}

interface HostessDist {
    id: string;
    name: string;
    amount: number;
}

interface CommissionPreview {
    totalCommission: number;
    assignedCommission: number;
    hostessDistribution: HostessDist[];
}

interface NewAccountSummaryProps {
    totals: Totals;
    commissionPreview: CommissionPreview;
    submitting: boolean;
    handleSubmit: () => void;
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    isDark: boolean;
    isTablet: boolean;
}

export function NewAccountSummary({
    totals,
    commissionPreview,
    submitting,
    handleSubmit,
    accentColor,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    isDark,
    isTablet,
}: NewAccountSummaryProps) {
    const spacing = isTablet ? 24 : 16;
    const borderRadius = isTablet ? 28 : 24;

    const dynamicStyles = {
        summaryCard: { 
            padding: spacing + 8, 
            borderRadius: borderRadius + 4 
        },
        submitBtn: { 
            height: isTablet ? 70 : 60, 
            borderRadius: isTablet ? 24 : 20 
        },
    };

    return (
        <View style={[styles.summaryCard, dynamicStyles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>Consumo Total</Text>
                <Text style={[styles.summaryVal, { color: textPrimary }]}>${totals.subtotal.toLocaleString()}</Text>
            </View>

            {commissionPreview.totalCommission > 0 && (
                <View style={[styles.commissionContainer, { borderTopColor: borderColor }]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Comision Productos</Text>
                        <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>
                            ${commissionPreview.totalCommission.toLocaleString()}
                        </Text>
                    </View>

                    {commissionPreview.hostessDistribution.length > 0 && (
                        <View style={styles.hostessDistList}>
                            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Distribucion por anfitriona</Text>
                            {commissionPreview.hostessDistribution.map((item) => (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.summaryRow,
                                        styles.hostessDistRow,
                                        {
                                            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.10)' : '#FFF7ED',
                                            borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FED7AA',
                                        }
                                    ]}
                                >
                                    <Text style={[styles.summaryLabel, { color: textPrimary }]}>{item.name}</Text>
                                    <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>${item.amount.toLocaleString()}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: borderColor }]}>
                <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>TOTAL CUENTA</Text>
                <Text style={[styles.totalValFinal, { color: accentColor }]}>${totals.total.toLocaleString()}</Text>
            </View>

            <Pressable
                style={[
                    styles.submitBtn, 
                    dynamicStyles.submitBtn, 
                    { 
                        backgroundColor: accentColor, 
                        shadowColor: accentColor 
                    }, 
                    submitting && { opacity: 0.7 }
                ]}
                onPress={handleSubmit}
                disabled={submitting}
                accessibilityLabel="Registrar cuenta"
                accessibilityRole="button"
            >
                {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <Text style={styles.submitBtnText}>Aperturar / Registrar Cuenta</Text>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    summaryCard: { 
        borderWidth: 1 
    },
    summaryRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginBottom: 8 
    },
    summaryLabel: { 
        fontSize: 14, 
        fontWeight: '600' 
    },
    summaryVal: { 
        fontSize: 15, 
        fontWeight: '800' 
    },
    commissionContainer: { 
        marginTop: 12, 
        paddingTop: 12, 
        borderTopWidth: 1 
    },
    hostessDistList: { 
        marginTop: 12, 
        gap: 8 
    },
    hostessDistRow: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    totalRow: { 
        marginTop: 12, 
        borderTopWidth: 1, 
        paddingTop: 12 
    },
    totalLabelFinal: { 
        fontSize: 18, 
        fontWeight: '900' 
    },
    totalValFinal: { 
        fontSize: 26, 
        fontWeight: '900' 
    },
    submitBtn: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        elevation: 4,
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 }
    },
    submitBtnText: { 
        color: '#FFF', 
        fontSize: 17, 
        fontWeight: '900', 
        letterSpacing: 0.5 
    },
});
