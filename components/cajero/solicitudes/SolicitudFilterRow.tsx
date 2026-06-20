import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

type FilterType = 'all' | 'anticipo' | 'pedido' | 'solicitud';

const LABELS: Record<FilterType, string> = {
    all: 'Todas',
    anticipo: 'Anticipos',
    pedido: 'Pedidos',
    solicitud: 'Servicios',
};

interface SolicitudFilterRowProps {
    activeFilter: FilterType;
    solicitudesCount: number;
    countByType: Record<FilterType, number>;
    filteredCount: number;
    isOffline: boolean;
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textSecondary: string;
    onFilterChange: (filter: FilterType) => void;
}

export const SolicitudFilterRow: React.FC<SolicitudFilterRowProps> = ({
    activeFilter,
    solicitudesCount,
    countByType,
    filteredCount,
    isOffline,
    accentColor,
    cardBg,
    borderColor,
    textSecondary,
    onFilterChange,
}) => (
    <>
        <View style={[styles.filterRow, { paddingHorizontal: 16 }]}>
            {(['all', 'anticipo', 'pedido', 'solicitud'] as FilterType[]).map((type) => {
                const count = type === 'all' ? solicitudesCount : countByType[type];
                return (
                    <Pressable
                        key={type}
                        style={[
                            styles.filterTab,
                            { backgroundColor: cardBg, borderColor },
                            activeFilter === type && { backgroundColor: accentColor, borderColor: accentColor }
                        ]}
                        onPress={() => onFilterChange(type)}
                    >
                        <Text style={[
                            styles.filterTabText,
                            { color: textSecondary },
                            activeFilter === type && { color: '#FFFFFF', fontWeight: '800' }
                        ]}>
                            {LABELS[type]} ({count})
                        </Text>
                    </Pressable>
                );
            })}
        </View>

        {solicitudesCount > 0 && !isOffline && (
            <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={[styles.urgencyBar, { backgroundColor: accentColor, marginHorizontal: 16 }]}
            >
                <Ionicons name="warning" size={20} color="#FFFFFF" />
                <Text style={styles.urgencyBarText}>
                    {filteredCount} {activeFilter === 'all' ? 'SOLICITUDES' : activeFilter.toUpperCase()} PENDIENTE{filteredCount !== 1 ? 'S' : ''}
                </Text>
            </MotiView>
        )}
    </>
);

const styles = StyleSheet.create({
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    filterTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
    filterTabText: { fontSize: 12, fontWeight: '700' },
    urgencyBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16,
        gap: 10, elevation: 4, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)', marginBottom: 8,
    },
    urgencyBarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
});
