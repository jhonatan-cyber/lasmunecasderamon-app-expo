import { RefreshControl } from 'react-native';
import { Client } from '@/hooks/useClientes';
import { useAccentColor } from '@/hooks/useAccentColor';
import { HistorySummaryCards } from './HistorySummaryCards';
import { HistoryEmptyState } from './HistoryEmptyState';
import { HistoryItemCard } from './HistoryItemCard';
import { DetailSheet } from '@/components/ui/DetailSheet';

interface ClientHistoryModalProps {
    visible: boolean;
    editingClient: Client | null;
    isDark: boolean;
    insets: { bottom: number };
    historyLoading: boolean;
    historyData: any[];
    refreshingHistory: boolean;
    accentColor: string;
    textPrimary: string;
    textSecondary: string;
    fetchHistory: (clientId: string | number) => Promise<void>;
    setRefreshingHistory: (val: boolean) => void;
    onClose: () => void;
}

export function ClientHistoryModal({
    visible,
    editingClient,
    isDark,
    insets,
    historyLoading,
    historyData,
    refreshingHistory,
    accentColor,
    textPrimary,
    textSecondary,
    fetchHistory,
    setRefreshingHistory,
    onClose
}: ClientHistoryModalProps) {
    const { textPrimary: themePrimary, textSecondary: themeSecondary } = useAccentColor();
    const totalServicios = historyData
        .filter((i: any) => i.category === 'SERVICIO')
        .reduce((a: number, i: any) => a + Number(i.monto || 0), 0);
    const totalConsumo = historyData
        .filter((i: any) => i.category === 'CONSUMO')
        .reduce((a: number, i: any) => a + Number(i.monto || 0), 0);
    const totalCargas = historyData
        .filter((i: any) => i.category === 'CARGA')
        .reduce((a: number, i: any) => a + Number(i.monto || 0), 0);

    return (
        <DetailSheet
            visible={visible}
            onClose={onClose}
            title="Historial de Cuenta"
            subtitle={`${editingClient?.name ?? ''} ${editingClient?.lastName ?? ''}`.trim() || undefined}
            loading={historyLoading}
            loadingLabel="Cargando movimientos..."
            height="83%"
            footerActions={[{ label: 'Cerrar', onPress: onClose }]}
            refreshControl={
                <RefreshControl
                    refreshing={refreshingHistory}
                    onRefresh={() => {
                        if (editingClient) {
                            setRefreshingHistory(true);
                            fetchHistory(editingClient.id);
                        }
                    }}
                    tintColor={accentColor}
                />
            }
            accessibilityLabel="Historial de cuenta"
        >
                            {historyData.length > 0 && (
                                <HistorySummaryCards
                                    totalServicios={totalServicios}
                                    totalConsumo={totalConsumo}
                                    totalCargas={totalCargas}
                                />
                            )}

                            {historyData.length === 0 ? (
                                <HistoryEmptyState textSecondary={themeSecondary} />
                            ) : (
                                historyData.map((item: any, index: number) => (
                                    <HistoryItemCard
                                        key={`${item.id}-${index}`}
                                        item={item}
                                        index={index}
                                        isDark={isDark}
                                        textPrimary={themePrimary}
                                        textSecondary={themeSecondary}
                                    />
                                ))
                            )}
        </DetailSheet>
    );
}

