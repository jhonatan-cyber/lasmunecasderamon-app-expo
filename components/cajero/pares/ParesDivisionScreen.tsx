import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { showToast } from '@/utils/toast-lazy';

interface Empleado {
  id: string;
  name: string;
  lastName: string;
  role: string;
  horasExtra?: number;
}

interface Venta {
  id: string;
  monto: number;
  empleadoId: string;
  empleado?: Empleado;
}

export default function ParesDivisionScreen() {
  const router = useRouter();
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const caja = useCajaAbierta();

  const [empleados, setEmpleados] = React.useState<Empleado[]>([]);
  const [ventas, setVentas] = React.useState<Venta[]>([]);

  const [selectedVentaId, setSelectedVentaId] = React.useState<string | null>(null);
  const [pares, setPares] = React.useState<Map<string, string[]>>(new Map());

  React.useEffect(() => {
    const data: { empleados: Empleado[]; ventas: Venta[] } = {
      empleados: [
        { id: '1', name: 'Ana', lastName: 'Gomez', role: 'cajero', horasExtra: 2 },
        { id: '2', name: 'Carlos', lastName: 'Torres', role: 'barman', horasExtra: 1 },
        { id: '3', name: 'Laura', lastName: 'Rojas', role: 'garzon', horasExtra: 0 },
        { id: '4', name: 'Miguel', lastName: 'Hernandez', role: 'barman', horasExtra: 3 },
        { id: '5', name: 'Sofia', lastName: 'Diaz', role: 'cajero', horasExtra: 0 },
      ],
      ventas: [
        { id: 'V-1001', monto: 120000, empleadoId: '1' },
        { id: 'V-1002', monto: 95000, empleadoId: '2' },
        { id: 'V-1003', monto: 150000, empleadoId: '3' },
        { id: 'V-1004', monto: 80000, empleadoId: '4' },
        { id: 'V-1005', monto: 200000, empleadoId: '5' },
      ],
    };
    // Inicialización sincrónica de datos estáticos — no hay fuente externa
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmpleados(data.empleados);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVentas(data.ventas);
  }, []);

  React.useEffect(() => {
    const initial: Map<string, string[]> = new Map();
    ventas.forEach(v => {
      const empleado = empleados.find(e => e.id === v.empleadoId);
      if (empleado && !initial.has(empleado.role)) {
        initial.set(empleado.role, []);
      }
      if (!initial.has(empleado?.role ?? 'desconocido')) {
        initial.set(empleado?.role ?? 'desconocido', []);
      }
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPares(initial);
  }, [ventas, empleados]);

  const empleadoSeleccionado = React.useMemo(() =>
    empleados.find(e => e.id === selectedVentaId) ?? null,
    [empleados, selectedVentaId]
  );

  const ventaSeleccionada = React.useMemo(() =>
    ventas.find(v => v.id === selectedVentaId) ?? null,
    [ventas, selectedVentaId]
  );

  const roleLabels: Record<string, string> = {
    cajero: 'Cajero',
    barman: 'Barman',
    garzon: 'Garzón',
  };

  const handleAsignar = React.useCallback((ventaId: string, role: string, empleadoId: string) => {
    setPares(prev => {
      const copy = new Map(prev);
      if (!copy.has(role)) copy.set(role, []);
      const actual = copy.get(role) ?? [];
      copy.set(role, [...actual, empleadoId]);
      return copy;
    });
    showToast({ type: 'success', text1: 'Par asignado' });
  }, []);

  const handleQuitar = React.useCallback((ventaId: string, role: string) => {
    setPares(prev => {
      const copy = new Map(prev);
      const actual = copy.get(role) ?? [];
      copy.set(role, actual.filter(id => id !== ventaId));
      return copy;
    });
    showToast({ type: 'info', text1: 'Par quitado' });
  }, []);

  const calcularTotalPorRole = React.useCallback(() => {
    const totals = new Map<string, number>();
    ventas.forEach(v => {
      const empleado = empleados.find(e => e.id === v.empleadoId);
      const role = empleado?.role ?? 'desconocido';
      totals.set(role, (totals.get(role) ?? 0) + v.monto);
    });
    return totals;
  }, [ventas, empleados]);

  const totales = calcularTotalPorRole();

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Pares de Ventas"
        subtitle="División de pares por ventas"
        rightComponent={
          <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextHeader}>Atrás</Text>
          </Pressable>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Filtro de venta */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Seleccionar venta</Text>
          <View style={styles.ventaList}>
            {ventas.map(venta => {
              const empleado = empleados.find(e => e.id === venta.empleadoId);
              const isSelected = selectedVentaId === venta.id;
              return (
                <Pressable
                  key={venta.id}
                  onPress={() => setSelectedVentaId(venta.id)}
                  style={[
                    styles.ventaRow,
                    { borderColor },
                    isSelected && { backgroundColor: `${accentColor}10` },
                  ]}
                >
                  <View style={styles.ventaInfo}>
                    <Text style={[styles.ventaId, { color: textPrimary }]}>{venta.id}</Text>
                    <Text style={[styles.ventaMonto, { color: textSecondary }]}>
                      ${venta.monto.toLocaleString()}
                    </Text>
                    <Text style={[styles.ventaEmpleado, { color: textSecondary }]}>
                      {empleado ? `${empleado.name} ${empleado.lastName}` : 'Sin empleado'}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'chevron-forward' : 'chevron-forward-outline'}
                    size={20}
                    color={textSecondary}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {selectedVentaId && (
          <>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Detalle de la venta: {selectedVentaId}
              </Text>
              {empleadoSeleccionado ? (
                <View style={styles.empleadoInfo}>
                  <Text style={[styles.empleadoNombre, { color: textPrimary }]}>
                    {empleadoSeleccionado.name} {empleadoSeleccionado.lastName}
                  </Text>
                  <Text style={[styles.empleadoRole, { color: textSecondary }]}>
                    {roleLabels[empleadoSeleccionado.role] || empleadoSeleccionado.role}
                  </Text>
                  <Text style={[styles.empleadoHoras, { color: textSecondary }]}>
                    {empleadoSeleccionado.horasExtra ? `${empleadoSeleccionado.horasExtra} horas extra` : 'Sin horas extra'}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: textSecondary, fontSize: 12 }}>
                  Empleado no asignado
                </Text>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Asignación de pares
              </Text>

              {['cajero', 'barman', 'garzon'].map(role => {
                const empleadosRole = empleados.filter(e => e.role === role);
                const panesRole = pares.get(role) ?? [];
                return (
                  <View key={role} style={[styles.roleRow, { borderColor }]}>
                    <Text style={[styles.roleTitle, { color: textPrimary }]}>
                      {roleLabels[role] || role}
                    </Text>
                    <Text style={[styles.roleCount, { color: textSecondary }]}>
                      {panesRole.length} par(es)
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Total por rol
              </Text>
              {Object.entries(totales).map(([role, total]) => (
                <View key={role} style={styles.totalRow}>
                  <Text style={[styles.totalRole, { color: textSecondary }]}>
                    {roleLabels[role] || role}
                  </Text>
                  <Text style={[styles.totalAmount, { color: accentColor, fontWeight: '700' }]}>
                    ${total.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16, gap: 16 },
  backBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backTextHeader: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  ventaList: { gap: 8 },
  ventaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  ventaInfo: { flex: 1 },
  ventaId: { fontSize: 14, fontWeight: '700' },
  ventaMonto: { fontSize: 13, fontWeight: '600' },
  ventaEmpleado: { fontSize: 12, fontWeight: '500' },
  empleadoInfo: { gap: 4 },
  empleadoNombre: { fontSize: 16, fontWeight: '700' },
  empleadoRole: { fontSize: 12, fontWeight: '500' },
  empleadoHoras: { fontSize: 11, fontWeight: '500' },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  roleTitle: { fontSize: 14, fontWeight: '700' },
  roleCount: { fontSize: 12, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  totalRole: { fontSize: 14, fontWeight: '600' },
  totalAmount: { fontSize: 14, fontWeight: '700' },
});
