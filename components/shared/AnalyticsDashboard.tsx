import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { DonutChart } from '@/components/ui/DonutChart';

const { width } = Dimensions.get('window');

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Text style={[styles.icon, { color }]}>{icon}</Text>
            </View>
            <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
            {subtitle ? <Text style={[styles.statSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
        </View>
    );
};

interface MiniChartProps {
    data: { label: string; value: number }[];
    color: string;
    height?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, color, height = 80 }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <View style={[styles.miniChartContainer, { height }]}>
            {data.map((item, index) => (
                <View key={index} style={styles.barContainer}>
                    <View
                        style={[
                            styles.bar,
                            {
                                height: `${(item.value / maxValue) * 100}%`,
                                backgroundColor: color
                            }
                        ]}
                    />
                    <Text style={styles.barLabel}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
};

export const AnalyticsDashboard: React.FC = () => {
    const { colors, theme } = useTheme();

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => apiClient('/dashboard/stats', { method: 'GET' }),
        staleTime: 30000,
    });

    const { data: salesData, isLoading: salesLoading } = useQuery({
        queryKey: ['sales-chart'],
        queryFn: async () => apiClient('/dashboard/sales-chart', { method: 'GET' }),
        staleTime: 60000,
    });

    const stats = statsData?.data || {};
    const salesChart = salesData?.data || { weekly: [], daily: [] };

    const statusItems = [
        { label: 'Pendientes', color: '#F59E0B', value: stats.servicesByStatus?.pendientes || 0 },
        { label: 'En Proceso', color: '#3B82F6', value: stats.servicesByStatus?.enProceso || 0 },
        { label: 'Completados', color: '#10B981', value: stats.servicesByStatus?.completados || 0 },
        { label: 'Cancelados', color: '#EF4444', value: stats.servicesByStatus?.cancelados || 0 },
    ];

    const totalStatuses = statusItems.reduce((sum, item) => sum + item.value, 0);
    const completedPercent = Math.round((statusItems[2].value / Math.max(totalStatuses, 1)) * 100);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (statsLoading || salesLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.headerSkeleton}>
                    <Skeleton width={150} height={24} style={{ borderRadius: 8 }} />
                    <Skeleton width={100} height={16} style={{ borderRadius: 4, marginTop: 8 }} />
                </View>
                <View style={styles.statsGrid}>
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} width={(width - 48) / 2} height={100} style={{ borderRadius: 12 }} />
                    ))}
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Resumen Analytics</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Actualizado: {new Date().toLocaleDateString('es-PE')}
                </Text>
            </View>

            <View style={styles.statsGrid}>
                <StatCard
                    title="Ventas Hoy"
                    value={formatCurrency(stats.salesToday || 0)}
                    subtitle={`${stats.salesCountToday || 0} transacciones`}
                    icon="$"
                    color="#10B981"
                />
                <StatCard
                    title="Servicios Activos"
                    value={stats.activeServices || 0}
                    subtitle={`${stats.completedServicesToday || 0} completados`}
                    icon="S"
                    color="#3B82F6"
                />
                <StatCard
                    title="Usuarios Activos"
                    value={stats.activeUsers || 0}
                    subtitle="Conectados ahora"
                    icon="U"
                    color="#8B5CF6"
                />
                <StatCard
                    title="Propinas"
                    value={formatCurrency(stats.tipsToday || 0)}
                    subtitle="Hoy"
                    icon="T"
                    color="#F59E0B"
                />
            </View>

            {salesChart.weekly?.length > 0 && (
                <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Ventas Semanales</Text>
                    <MiniChart
                        data={salesChart.weekly.map((item: any) => ({
                            label: item.day?.substring(0, 3) || '',
                            value: item.total || 0
                        }))}
                        color="#3B82F6"
                    />
                </View>
            )}

            {stats.servicesByStatus && (
                <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Servicios por Estado</Text>
                    <View style={styles.chartRow}>
                        <DonutChart
                            percent={completedPercent}
                            color="#10B981"
                            size={140}
                            label="Completados"
                            isDark={theme === 'dark'}
                        />
                        <View style={styles.statusLegend}>
                            {statusItems.map((item) => (
                                <View key={item.label} style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                                        {item.label}: {item.value}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            )}

            {stats.topProducts && stats.topProducts.length > 0 && (
                <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Productos Mas Vendidos</Text>
                    {stats.topProducts.slice(0, 5).map((product: any, index: number) => (
                        <View key={index} style={styles.topProductItem}>
                            <Text style={[styles.productRank, { color: colors.textSecondary }]}>#{index + 1}</Text>
                            <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                            <Text style={[styles.productQty, { color: colors.textSecondary }]}>
                                {product.quantity}unid.
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Informacion en Tiempo Real</Text>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Los datos se actualizan cada 30 segundos. Desliza hacia abajo para actualizar.
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        paddingTop: 8,
    },
    headerSkeleton: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        gap: 12,
    },
    statCard: {
        width: '47%',
        padding: 16,
        borderRadius: 12,
        marginBottom: 4,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    icon: {
        fontSize: 20,
        fontWeight: '700',
    },
    statTitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 4,
    },
    statSubtitle: {
        fontSize: 11,
        marginTop: 2,
    },
    chartCard: {
        margin: 16,
        padding: 16,
        borderRadius: 16,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    chartRow: {
        alignItems: 'center',
        gap: 16,
    },
    miniChartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingTop: 8,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginHorizontal: 2,
    },
    bar: {
        width: '60%',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        marginTop: 6,
        color: '#64748B',
    },
    statusLegend: {
        gap: 8,
        width: '100%',
        marginTop: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 13,
        fontWeight: '500',
    },
    topProductItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    productRank: {
        width: 32,
        fontSize: 14,
        fontWeight: '600',
    },
    productName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    productQty: {
        fontSize: 12,
    },
    infoCard: {
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 16,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
    },
});



