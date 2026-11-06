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
  fecha: string;
  horaInicio: string;
  horaFin: string;
  sueldo: number;
  aporte: number;
  total: number;
  estado: string;
}

export default function PersonalAsistenciaSummaryScreen() {
  const router = useRouter();
  const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const caja = useCajaAbierta();

  const [empleados, setEmpleados] = React.useState<Empleado[]>([]);

  React.useEffect(() => {
    const data: Empleado[] = [
      { id: '1', name: 'Ana', lastName: 'Gomez', role: 'cajero', fecha: '2026-11-05', horaInicio: '09:00', horaFin: '18:00', sueldo: 200000, aporte: 30000, total: 170000, estado: 'pendiente' },
      { id: '2', name: 'Carlos', lastName: 'Torres', role: 'barman', fecha: '2026-11-05', horaInicio: '10:00', horaFin: '19:00', sueldo: 180000, aporte: 25000, total: 155000, estado: 'pendiente' },
      { id: '3', name: 'Laura', lastName: 'Rojas', role: 'garzon', fecha: '2026-11-05', horaInicio: '12:00', horaFin: '20:00', sueldo: 190000, aporte: 28000, total: 162000, estado: 'pendiente' },
      { id: '4', name: 'Miguel', lastName: 'Hernandez', role: 'barman', fecha: '2026-11-05', horaInicio: '08:00', horaFin: '16:00', sueldo: 170000, aporte: 20000, total: 150000, estado: 'pendiente' },
      { id: '5', name: 'Sofia', lastName: 'Diaz', role: 'cajero', fecha: '2026-11-05', horaInicio: '11:00', horaFin: '17:00', sueldo: 185000, aporte: 27000, total: 158000, estado: 'pendiente' },
    ];
    setEmpleados(data);
  }, []);

  const [selectedEmpleadoId, setSelectedEmpleadoId] = React.useState<string | null>(null);

  const selectedEmpleado = React.useMemo(() =>
    empleados.find(e => e.id === selectedEmpleadoId) ?? null,
    [empleados, selectedEmpleadoId]
  );

  const calcularMinimo = React.useMemo(() => {
    const horas = empleados.map(e => {
      const [h1, m1] = e.horaInicio.split(':').map(Number);
      const [h2, m2] = e.horaFin.split(':').map(Number);
      return (h2 * 60 + m2) - (h1 * 60 + m1);
    });
    return Math.min(...horas);
  }, [empleados]);

  const calcularMaximo = React.useMemo(() => {
    const horas = empleados.map(e => {
      const [h1, m1] = e.horaInicio.split(':').map(Number);
      const [h2, m2] = e.horaFin.split(':').map(Number);
      return (h2 * 60 + m2) - (h1 * 60 + m1);
    });
    return Math.max(...horas);
  }, [empleados]);

  const calcularPromedio = React.useMemo(() => {
    const horas = empleados.map(e => {
      const [h1, m1] = e.horaInicio.split(':').map(Number);
      const [h2, m2] = e.horaFin.split(':').map(Number);
      return (h2 * 60 + m2) - (h1 * 60 + m1);
    });
    const total = horas.reduce((a, b) => a + b, 0);
    return total / horas.length;
  }, [empleados]);

  const calcularTotalHoras = React.useMemo(() => {
    const total = empleados.reduce((acc, e) => {
      const [h1, m1] = e.horaInicio.split(':').map(Number);
      const [h2, m2] = e.horaFin.split(':').map(Number);
      return acc + (h2 * 60 + m2) - (h1 * 60 + m1);
    }, 0);
    return `${Math.floor(total / 60)}h ${total % 60}m`;
  }, [empleados]);

  const totalSueldo = empleados.reduce((acc, e) => acc + e.sueldo, 0);
  const totalAporte = empleados.reduce((acc, e) => acc + e.aporte, 0);
  const totalACobrar = totalSueldo - totalAporte;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Resumen de Asistencia"
        subtitle="Mi turno"
        rightComponent={
          <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextHeader}>Atrás</Text>
          </Pressable>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Resumen del turno */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>RESUMEN DEL TURNO</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>Mínimo</Text>
              <Text style={[styles.summaryValue, { color: textPrimary }]}>{calcularMinimo}h</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>Máximo</Text>
              <Text style={[styles.summaryValue, { color: textPrimary }]}>{calcularMaximo}h</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>Promedio</Text>
              <Text style={[styles.summaryValue, { color: accentColor }]}>{calcularPromedio.toFixed(1)}h</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>Total</Text>
              <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{calcularTotalHoras}</Text>
            </View>
          </View>
        </View>

        {/* Totales generales */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>TOTALES GENERALES</Text>
          <View style={styles.totalGrid}>
            <View style={styles.totalItem}>
              <Text style={[styles.totalLabel, { color: textSecondary }]}>Sueldo</Text>
              <Text style={[styles.totalValue, { color: textPrimary }]}>
                ${totalSueldo.toLocaleString()}
              </Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={[styles.totalLabel, { color: textSecondary }]}>Aporte</Text>
              <Text style={[styles.totalValue, { color: '#EF4444' }]}>
                -${totalAporte.toLocaleString()}
              </Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={[styles.totalLabel, { color: textSecondary }]}>A cobrar</Text>
              <Text style={[styles.totalValue, { color: '#F59E0B', fontWeight: '700' }]}>
                ${totalACobrar.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Lista de empleados */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Empleados</Text>
          {empleados.map(empleado => {
            const isSelected = selectedEmpleadoId === empleado.id;
            return (
              <Pressable
                key={empleado.id}
                onPress={() => setSelectedEmpleadoId(empleado.id)}
                style={[
                  styles.empleadoRow,
                  { borderColor },
                  isSelected && { backgroundColor: `${accentColor}10` },
                ]}
              >
                <View style={styles.empleadoInfo}>
                  <Text style={[styles.empleadoNombre, { color: textPrimary }]}>
                    {empleado.name} {empleado.lastName}
                  </Text>
                  <Text style={[styles.empleadoRole, { color: textSecondary }]}>
                    {empleado.role} · {empleado.fecha}
                  </Text>
                </View>
                <View style={styles.empleadoStats}>
                  <Text style={[styles.empleadoHora, { color: textSecondary }]}>
                    {empleado.horaInicio} - {empleado.horaFin}
                  </Text>
                  <Text style={[styles.empleadoTotal, { color: accentColor, fontWeight: '700' }]}>
                    ${empleado.total.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.empleadoBadge}>
                  <Text style={[styles.empleadoBadgeText, { color: empleado.estado === 'pendiente' ? '#F59E0B' : '#10B981' }]}>
                    {empleado.estado}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  totalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  totalItem: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  totalValue: { fontSize: 16, fontWeight: '700' },
  empleadoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  empleadoInfo: { flex: 1 },
  empleadoNombre: { fontSize: 14, fontWeight: '700' },
  empleadoRole: { fontSize: 12, fontWeight: '500' },
  empleadoStats: { flex: 1, alignItems: 'flex-end' },
  empleadoHora: { fontSize: 12, fontWeight: '500' },
  empleadoTotal: { fontSize: 14, fontWeight: '700' },
  empleadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  empleadoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
