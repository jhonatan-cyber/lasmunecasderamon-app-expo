import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import { DonutChart } from '../components/DonutChart';

const { width } = Dimensions.get('window');

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
    const { theme } = useTheme();
    
    return (
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Text style={[styles.icon, { color }]}>{icon}</Text>
            </View>
            <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
            {subtitle && <Text style={[styles.statSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
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
    const { theme } = useTheme();
    const { user } = useAuthStore();
    
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await apiClient('/dashboard/stats', { method: 'GET' });
            return response;
        },
        staleTime: 30000,
    });

    const { data: salesData, isLoading: salesLoading } = useQuery({
        queryKey: ['sales-chart'],
        queryFn: async () => {
            const response = await apiClient('/dashboard/sales-chart', { method: 'GET' });
            return response;
        },
        staleTime: 60000,
    });

    const stats = statsData?.data || {};
    const salesChart = salesData?.data || { weekly: [], daily: [] };

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
            <View style={[styles.container, { backgroundColor: theme.background }]}>
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
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Resumen Analytics</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Actualizado: {new Date().toLocaleDateString('es-PE')}
                </Text>
            </View>

            <View style={styles.statsGrid}>
                <StatCard
                    title="Ventas Hoy"
                    value={formatCurrency(stats.salesToday || 0)}
                    subtitle={`${stats.salesCountToday || 0} transacciones`}
                    icon="💰"
                    color="#10B981"
                />
                <StatCard
                    title="Servicios Activos"
                    value={stats.activeServices || 0}
                    subtitle={`${stats.completedServicesToday || 0} completados`}
                    icon="🛎️"
                    color="#3B82F6"
                />
                <StatCard
                    title="Usuarios Activos"
                    value={stats.activeUsers || 0}
                    subtitle="Conectados ahora"
                    icon="👥"
                    color="#8B5CF6"
                />
                <StatCard
                    title="Propinas"
                    value={formatCurrency(stats.tipsToday || 0)}
                    subtitle="Hoy"
                    icon="💵"
                    color="#F59E0B"
                />
            </View>

            {salesChart.weekly?.length > 0 && (
                <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.chartTitle, { color: theme.text }]}>Ventas Semanales</Text>
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
                <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.chartTitle, { color: theme.text }]}>Servicios por Estado</Text>
                    <View style={styles.chartRow}>
                        <DonutChart 
                            data={[
                                { value: stats.servicesByStatus.pendientes || 0, color: '#F59E0B', label: 'Pendientes' },
                                { value: stats.servicesByStatus.enProceso || 0, color: '#3B82F6', label: 'En Proceso' },
                                { value: stats.servicesByStatus.completados || 0, color: '#10B981', label: 'Completados' },
                                { value: stats.servicesByStatus.cancelados || 0, color: '#EF4444', label: 'Cancelados' },
                            ]}
                            size={140}
                        />
                    </View>
                </View>
            )}

            {stats.topProducts && stats.topProducts.length > 0 && (
                <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.chartTitle, { color: theme.text }]}>Productos Más Vendidos</Text>
                    {stats.topProducts.slice(0, 5).map((product: any, index: number) => (
                        <View key={index} style={styles.topProductItem}>
                            <Text style={[styles.productRank, { color: theme.textSecondary }]}>#{index + 1}</Text>
                            <Text style={[styles.productName, { color: theme.text }]}>{product.name}</Text>
                            <Text style={[styles.productQty, { color: theme.textSecondary }]}>
                                {product.quantity}unid.
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.infoTitle, { color: theme.text }]}>📊 Información en Tiempo Real</Text>
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
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
        marginTop: 4,
    },
    chartCard: {
        margin: 16,
        padding: 16,
        borderRadius: 12,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    chartRow: {
        alignItems: 'center',
    },
    miniChartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        paddingTop: 8,
    },
    barContainer: {
        alignItems: 'center',
        flex: 1,
    },
    bar: {
        width: 28,
        borderRadius: 4,
        minHeight: 8,
    },
    barLabel: {
        fontSize: 10,
        marginTop: 4,
        color: '#888',
    },
    topProductItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    productRank: {
        width: 30,
        fontWeight: '600',
    },
    productName: {
        flex: 1,
        fontSize: 14,
    },
    productQty: {
        fontSize: 12,
    },
    infoCard: {
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 12,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 12,
    },
});

export default AnalyticsDashboard;