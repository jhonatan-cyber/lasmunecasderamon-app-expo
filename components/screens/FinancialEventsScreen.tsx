import { EmployeeListError } from '@/components/shared/EmployeeListError';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, useCallback } from 'react';
import { useStableCallback } from '@/hooks/useStableCallback';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { FilterTabs } from '@/components/ui/FilterTabs';
import VirtualizedList from '@/components/shared/VirtualizedList';
import { EmptyState } from '@/components/ui/EmptyState';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { TipDetailModal } from '@/components/shared/TipDetailModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useFinancialEvents } from '@/hooks/useFinancialEvents';
import { apiClientSafe } from '@/api/client';
import { parseDateSafe } from '@/utils/timeUtils';
import { FinancialEventCard } from '@/components/financial-events/FinancialEventCard';

import logger from '@/utils/logger';
interface FinancialEventsScreenProps {
  title: string;
  subtitle: string;
  type: 'comisiones' | 'propinas';
  /**
   * Muestra el botón «Atrás» del PremiumHeader. Solo en las rutas
   * empujadas desde el home (cajero/barman — paridad con Flutter);
   * los tabs (garzón/anfitriona) no lo pasan.
   */
  onBack?: () => void;
}

export function FinancialEventsScreen({
  title,
  subtitle,
  type,
  onBack,
}: FinancialEventsScreenProps) {
  const {
    accentColor,
    isDark,
    bg,
    cardBg,
    surfaceMuted,
    textPrimary,
    textSecondary,
    borderColor, accentOnSurface} = useAccentColor();
  const { data, loading, refreshing, error, onRefresh } = useFinancialEvents(
    type as any,
  );
  const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saleDetail, setSaleDetail] = useState<any>(null);
  const [parentPropina, setParentPropina] = useState<any>(null);

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return 'Sin fecha';
    try {
      const date = parseDateSafe(dateStr);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      const day = date.getUTCDate();
      const month = date.toLocaleDateString('es-ES', { month: 'short' });
      const year = date.getUTCFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return 'Error';
    }
  }, []);

  const formatTime = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = parseDateSafe(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }, []);

  const handleItemPress = useCallback(
    async (item: any) => {
      setSelectedItem(item);
      setModalVisible(true);
      setLoadingDetail(true);
      setSaleDetail(null);
      setParentPropina(null);

      try {
        if (type === 'propinas') {
          const tipRes = await apiClientSafe(`/tips/${item.propina_id}`);
          if ((tipRes as any).success) {
            setParentPropina((tipRes as any).data);
            if ((tipRes as any).data?.venta_id) {
              const saleRes = await apiClientSafe(
                `/sales/${(tipRes as any).data.venta_id}`,
              );
              if (saleRes && !(saleRes as any).error)
                setSaleDetail((saleRes as any).data || saleRes);
            }
          }
        } else {
        }
      } catch (e) {
        logger.captureException(e, {
          context: 'FinancialEventsScreen:fetchDetail',
        });
      } finally {
        setLoadingDetail(false);
      }
    },
    [type],
  );

  const filteredData = data.filter((a: any) => {
    if (filter === 'pendiente') return a.estado === 1;
    // Pagado = todo lo que no está pendiente: 0 en propinas
    // (PayrollRepository) y 2 en comisiones (CommissionRepository).
    if (filter === 'pagado')
      return Number(a.estado) === (type === 'comisiones' ? 2 : 0);
    return true;
  });

  const pendientes = data.filter((a: any) => a.estado === 1);
  const totalPendiente = pendientes.reduce(
    (sum, a) => sum + (a.comision || a.monto || 0),
    0,
  );
  const totalGeneral = data
    .filter((a) => type !== 'comisiones' || Number(a.estado) !== 0)
    .reduce((sum, a) => sum + (a.comision || a.monto || 0), 0);

  const renderItem = useStableCallback(
    ({ item, index }: { item: any; index: number }) => (
      <FinancialEventCard
        item={item}
        index={index}
        type={type}
        isDark={isDark}
        accentColor={accentColor}
        cardBg={cardBg}
        surfaceMuted={surfaceMuted}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
        formatDate={formatDate}
        formatTime={formatTime}
        onPress={handleItemPress}
      />
    ),
  );

  if (loading)
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader title={title} onBack={onBack} />
        <View style={{ padding: 16 }}>
          <SkeletonLoader width="100%" height={140} borderRadius={16} />
        </View>
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2].map((i) => (
            <SkeletonLoader
              key={i}
              width="100%"
              height={100}
              borderRadius={16}
            />
          ))}
        </View>
      </View>
    );

  if (error)
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader title={title} />
        <EmployeeListError message={error} onRetry={onRefresh} />
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader title={title} subtitle={subtitle} onBack={onBack} />

      <View
        style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}
      >
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          TOTAL PENDIENTE
        </Text>
        <Text style={[styles.summaryAmount, { color: accentOnSurface }]}>
          ${totalPendiente.toLocaleString()}
        </Text>
        <View style={styles.summaryDetails}>
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            Historial: ${totalGeneral.toLocaleString()}
          </Text>
          <View
            style={{ width: 1, height: 12, backgroundColor: borderColor }}
          />
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            {pendientes.length} items
          </Text>
        </View>
      </View>

      <FilterTabs
        tabs={[
          { key: 'all', label: 'Todas', count: data.length },
          { key: 'pendiente', label: 'Pendientes', count: pendientes.length },
          {
            key: 'pagado',
            label: 'Cobradas',
            count: data.length - pendientes.length,
          },
        ]}
        activeKey={filter}
        onTabPress={setFilter}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <VirtualizedList
        data={filteredData}
        keyExtractor={(item: any) =>
          (
            item.id_comision ||
            item.id_detalle_propina ||
            item.id ||
            'unknown'
          ).toString()
        }
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
        ListEmptyComponent={
          <EmptyState icon="file-tray-outline" title="No se encontraron registros" message="No hay eventos financieros para el tipo seleccionado. Intenta cambiar el filtro." />
        }
        getItemLayout={(_: any, index: number) => ({
          length: 180,
          offset: 180 * index,
          index,
        })}
        windowSize={10}
        maxToRenderPerBatch={7}
        initialNumToRender={5}
        removeClippedSubviews={true}
      />

      {type === 'propinas' ? (
        <TipDetailModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          loading={loadingDetail}
          selectedPropina={selectedItem}
          parentPropina={parentPropina}
          saleDetail={saleDetail}
        />
      ) : (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: textPrimary }]}>
                    Detalles
                  </Text>
                  <Text
                    style={[styles.modalSubtitle, { color: textSecondary }]}
                  >
                    Código:{' '}
                    {selectedItem?.codigo ||
                      selectedItem?.codigo_venta ||
                      '---'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={24} color={textPrimary} />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={{ padding: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {loadingDetail ? (
                  <View style={styles.detailLoadingBox}>
                    <ActivityIndicator size="large" color={accentOnSurface} />
                    <Text style={{ color: textSecondary, marginTop: 15 }}>
                      Cargando detalles...
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.infoCard,
                      { borderColor, backgroundColor: cardBg },
                    ]}
                  >
                    <Text style={[styles.cardTitle, { color: textSecondary }]}>
                      DATOS DE LA COMISIÓN
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={{ color: textSecondary }}>Cliente:</Text>
                      <Text style={{ color: textPrimary, fontWeight: '700' }}>
                        {selectedItem?.cliente_nombre || 'Particular'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={{ color: textSecondary }}>Lugar:</Text>
                      <Text style={{ color: textPrimary, fontWeight: '700' }}>
                        {selectedItem?.habitacion_nombre || 'Barra'}
                      </Text>
                    </View>
                    {selectedItem?.productos && (
                      <View style={{ marginTop: 15 }}>
                        <Text
                          style={{
                            color: textSecondary,
                            fontSize: 11,
                            fontWeight: '800',
                            marginBottom: 5,
                          }}
                        >
                          PRODUCTOS:
                        </Text>
                        {(typeof selectedItem.productos === 'string'
                          ? JSON.parse(selectedItem.productos)
                          : selectedItem.productos
                        ).map((p: any, i: number) => (
                          <Text
                            key={i}
                            style={{ color: textPrimary, fontSize: 13 }}
                          >
                            â€¢ {p.cantidad}x {p.nombre}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[styles.closeModalBtn, { backgroundColor: accentColor }]}
              >
                <Text
                  style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}
                >
                  Cerrar
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryAmount: { fontSize: 38, fontWeight: '900', marginBottom: 12 },
  summaryDetails: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  summaryDetail: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  infoCard: { padding: 16, borderRadius: 20, borderWidth: 1 },
  cardTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  closeBtn: { padding: 4 },
  closeModalBtn: {
    height: 54,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },

  divisionCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  divisionItem: { flex: 1, alignItems: 'center' },
  divisionLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  divisionValue: { fontSize: 16, fontWeight: '800' },
  divisionDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(155,155,155,0.2)',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  productsList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  productNameDetail: { fontSize: 14, fontWeight: '700' },
  productSubtotal: { fontSize: 14, fontWeight: '800' },
  saleTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
  },
  saleTotalLabel: { fontSize: 13, fontWeight: '800' },
  saleTotalValue: { fontSize: 16, fontWeight: '900' },
  statusBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  paymentInfoBox: {
    marginTop: 15,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailLoadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
});
