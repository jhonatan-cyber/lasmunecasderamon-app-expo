import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  GratificacionEmployee,
  GratificacionItem,
  useGratificaciones
} from '@/hooks/useGratificaciones';

const estadoConfig: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Pagado', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  1: { label: 'Por pagar', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  2: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  3: { label: 'Rechazada', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' }
};

const formatCurrency = (value: number) => `$${(Number(value) || 0).toLocaleString('de-DE')}`;

export default function CajeroGratificacionesScreen() {
  const router = useRouter();
  const { accentColor, isDark } = useAccentColor();
  const { gratificaciones, employees, loading, refreshing, submitting, error, createGratificacion, onRefresh } =
    useGratificaciones();

  const [filter, setFilter] = useState<'todos' | 'pendiente' | 'por_pagar' | 'pagado' | 'rechazada'>('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<GratificacionEmployee | null>(null);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const bg = isDark ? '#000000' : '#FFFFFF';
  const cardBg = isDark ? '#111111' : '#F3F4F6';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? `${accentColor}40` : '#E2E8F0';

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter(employee =>
      `${employee.name} ${employee.lastName} ${employee.nick || ''}`.toLowerCase().includes(term)
    );
  }, [employeeSearch, employees]);

  const filteredData = useMemo(() => {
    if (filter === 'todos') return gratificaciones;
    return gratificaciones.filter(item => {
      if (filter === 'pendiente') return item.estado === 2;
      if (filter === 'por_pagar') return item.estado === 1;
      if (filter === 'pagado') return item.estado === 0;
      if (filter === 'rechazada') return item.estado === 3;
      return true;
    });
  }, [filter, gratificaciones]);

  const totals = useMemo(() => {
    return gratificaciones.reduce(
      (acc, item) => {
        if (item.estado === 2) acc.pendiente += item.monto;
        if (item.estado === 1) acc.porPagar += item.monto;
        if (item.estado === 0) acc.pagado += item.monto;
        return acc;
      },
      { pendiente: 0, porPagar: 0, pagado: 0 }
    );
  }, [gratificaciones]);

  const handleMontoChange = (text: string) => {
    const clean = text.replace(/\D/g, '');
    if (!clean) return setMonto('');
    setMonto(Number(clean).toLocaleString('de-DE'));
  };

  const resetForm = () => {
    setSelectedEmployee(null);
    setEmployeeSearch('');
    setMonto('');
    setDescripcion('');
  };

  const handleSubmit = async () => {
    const amount = Number(monto.replace(/\D/g, '') || 0);
    if (!selectedEmployee) return;
    if (!amount) return;

    await createGratificacion({
      usuario_id: selectedEmployee.id,
      monto: amount,
      descripcion: descripcion.trim()
    });

    setModalVisible(false);
    resetForm();
  };

  const renderItem = ({ item, index }: { item: GratificacionItem; index: number }) => {
    const status = estadoConfig[item.estado] || estadoConfig[2];
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor, shadowColor: isDark ? '#000' : '#111827' }
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.indexBadge, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
            <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={[styles.employeeName, { color: textPrimary }]}>{item.usuario}</Text>
        <Text style={[styles.amountText, { color: accentColor }]}>{formatCurrency(item.monto)}</Text>
        <Text style={[styles.descriptionText, { color: textSecondary }]}>
          {item.descripcion || 'Sin descripción'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: textSecondary }]}>
            {new Date(item.fecha_crea).toLocaleDateString('es-BO')}
          </Text>
          <Text style={[styles.metaText, { color: textSecondary }]}>
            {item.estado_texto?.replace(/_/g, ' ') || status.label}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader title="Gratificaciones" subtitle="Solicitudes y seguimiento" />
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonLoader width="100%" height={150} borderRadius={20} />
          <SkeletonLoader width="100%" height={110} borderRadius={18} />
          <SkeletonLoader width="100%" height={110} borderRadius={18} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Gratificaciones"
        subtitle="Crea solicitudes para aprobación"
        rightComponent={
          <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextHeader}>Atrás</Text>
          </Pressable>
        }
      />

      <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>TOTAL PENDIENTE DE APROBACIÓN</Text>
        <Text style={[styles.summaryAmount, { color: '#F59E0B' }]}>{formatCurrency(totals.pendiente)}</Text>
        <View style={styles.summaryDetails}>
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>Por pagar: {formatCurrency(totals.porPagar)}</Text>
          <View style={{ width: 1, height: 12, backgroundColor: borderColor }} />
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>Pagado: {formatCurrency(totals.pagado)}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['todos', 'pendiente', 'por_pagar', 'pagado', 'rechazada'] as const).map(item => (
          <Pressable
            key={item}
            style={[
              styles.filterButton,
              {
                backgroundColor: filter === item ? accentColor : cardBg,
                borderColor: filter === item ? accentColor : borderColor
              }
            ]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, { color: filter === item ? '#FFFFFF' : textSecondary }]}>
              {item === 'por_pagar'
                ? 'Por pagar'
                : item.charAt(0).toUpperCase() + item.slice(1).replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={[styles.emptyText, { color: textSecondary }]}>{error}</Text>
        </View>
      ) : (
        <FlashList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <Ionicons name="gift-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                No hay gratificaciones para este filtro
              </Text>
            </View>
          }
        />
      )}

      {!modalVisible && (
        <Pressable style={[styles.fab, { backgroundColor: accentColor }]} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.fabText}>Nueva gratificación</Text>
        </Pressable>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: bg }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Nueva Gratificación</Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </Pressable>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: cardBg, color: textPrimary, borderColor }]}
              placeholder="Buscar empleado"
              placeholderTextColor={textSecondary}
              value={employeeSearch}
              onChangeText={setEmployeeSearch}
            />

            <ScrollView
              style={[styles.employeeList, { backgroundColor: cardBg, borderColor }]}
              contentContainerStyle={{ padding: 8 }}
              nestedScrollEnabled
            >
              {filteredEmployees.map(employee => {
                const selected = selectedEmployee?.id === employee.id;
                return (
                  <Pressable
                    key={employee.id}
                    style={[
                      styles.employeeRow,
                      { backgroundColor: selected ? `${accentColor}20` : 'transparent' }
                    ]}
                    onPress={() => setSelectedEmployee(employee)}
                  >
                    <View>
                      <Text style={[styles.employeeRowName, { color: textPrimary }]}>
                        {employee.name} {employee.lastName}
                      </Text>
                      <Text style={[styles.employeeRowMeta, { color: textSecondary }]}>
                        @{employee.nick || 'sin-nick'} · {employee.role || 'Sin rol'}
                      </Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={accentColor} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <TextInput
              style={[styles.input, { backgroundColor: cardBg, color: textPrimary, borderColor }]}
              placeholder="Monto"
              placeholderTextColor={textSecondary}
              keyboardType="numeric"
              value={monto}
              onChangeText={handleMontoChange}
            />

            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: cardBg, color: textPrimary, borderColor }
              ]}
              placeholder="Descripción (opcional)"
              placeholderTextColor={textSecondary}
              multiline
              value={descripcion}
              onChangeText={setDescripcion}
            />

            <Pressable
              style={[
                styles.submitButton,
                {
                  backgroundColor: accentColor,
                  opacity: submitting || !selectedEmployee || !monto ? 0.7 : 1
                }
              ]}
              disabled={submitting || !selectedEmployee || !monto}
              onPress={handleSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar solicitud por WhatsApp</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    gap: 6
  },
  backTextHeader: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1
  },
  summaryLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  summaryAmount: { fontSize: 34, fontWeight: '900', marginBottom: 8 },
  summaryDetails: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  summaryDetail: { fontSize: 12, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 8
  },
  filterButton: {
    minWidth: 124,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 9999,
    alignItems: 'center',
    borderWidth: 1
  },
  filterText: { fontSize: 12, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 10 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  indexBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  indexText: { fontSize: 12, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999 },
  statusText: { fontSize: 11, fontWeight: '800' },
  employeeName: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  amountText: { fontSize: 24, fontWeight: '900', marginBottom: 6 },
  descriptionText: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 11, fontWeight: '600' },
  emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
  emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 42,
    right: 20,
    height: 56,
    borderRadius: 9999,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  fabText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  closeButton: { padding: 8, borderRadius: 9999, backgroundColor: 'rgba(128,128,128,0.15)' },
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16
  },
  textArea: { height: 84, textAlignVertical: 'top' },
  employeeList: {
    maxHeight: 220,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 16
  },
  employeeRow: {
    padding: 12,
    borderRadius: 9999,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  employeeRowName: { fontSize: 14, fontWeight: '700' },
  employeeRowMeta: { fontSize: 12, marginTop: 2 },
  submitButton: {
    borderRadius: 9999,
    padding: 18,
    alignItems: 'center',
    marginTop: 4
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }
});
