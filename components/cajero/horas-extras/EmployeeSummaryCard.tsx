import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface EmployeeStat {
    usuario_id: number;
    usuario: string;
    totalHoras: number;
    totalMonto: number;
    totalACobrar: number;
    count: number;
}

interface EmployeeSummaryCardProps {
    perEmployeeStats: EmployeeStat[];
    userFilter: string;
    setUserFilter: (userId: string) => void;
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
}

function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const formatCurrency = (value: number) => `$${(Number(value) || 0).toLocaleString('de-DE')}`;

export function EmployeeSummaryCard({
    perEmployeeStats,
    userFilter,
    setUserFilter,
    accentColor,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
}: EmployeeSummaryCardProps) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollContainer}>
            <View style={styles.listContainer}>
                {perEmployeeStats.map(emp => {
                    const isSelected = userFilter === String(emp.usuario_id);
                    return (
                        <Pressable
                            key={emp.usuario_id}
                            onPress={() => setUserFilter(isSelected ? 'all' : String(emp.usuario_id))}
                            style={[
                                styles.empSummaryCard,
                                {
                                    backgroundColor: isSelected ? `${accentColor}15` : cardBg,
                                    borderColor: isSelected ? accentColor : borderColor,
                                }
                            ]}
                        >
                            <View style={[styles.empSummaryAvatar, { backgroundColor: accentColor + '20' }]}>
                                <Text style={[styles.empSummaryInitials, { color: accentColor }]}>
                                    {getInitials(emp.usuario)}
                                </Text>
                            </View>
                            <View style={styles.infoContainer}>
                                <Text style={[styles.empSummaryName, { color: textPrimary }]} numberOfLines={1}>
                                    {emp.usuario.split(' ')[0]}
                                </Text>
                                <Text style={[styles.empSummaryStat, { color: textSecondary }]}>
                                    {emp.totalHoras.toFixed(1)}h · {emp.count} reg.
                                </Text>
                                <Text style={[styles.empSummaryAmount, { color: emp.totalACobrar > 0 ? '#F59E0B' : textPrimary }]}>
                                    {formatCurrency(emp.totalMonto)}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: { 
        marginTop: 12 
    },
    listContainer: { 
        flexDirection: 'row', 
        gap: 8, 
        paddingHorizontal: 16, 
        paddingVertical: 4 
    },
    empSummaryCard: {
        borderRadius: 16, 
        borderWidth: 1, 
        padding: 12, 
        minWidth: 140,
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10,
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.06, 
        shadowRadius: 6, 
        elevation: 1,
    },
    empSummaryAvatar: { 
        width: 36, 
        height: 36, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    empSummaryInitials: { 
        fontSize: 12, 
        fontWeight: '900' 
    },
    infoContainer: { 
        gap: 2 
    },
    empSummaryName: { 
        fontSize: 12, 
        fontWeight: '800', 
        maxWidth: 90 
    },
    empSummaryStat: { 
        fontSize: 10, 
        fontWeight: '600' 
    },
    empSummaryAmount: { 
        fontSize: 13, 
        fontWeight: '900' 
    },
});
