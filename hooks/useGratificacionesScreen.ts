import { useMemo, useState } from 'react';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  useGratificaciones,
  GratificacionEmployee,
} from '@/hooks/useGratificaciones';

export function useGratificacionesScreen() {
  const theme = useAccentColor();
  const {
    gratificaciones,
    employees,
    loading,
    refreshing,
    submitting,
    error,
    createGratificacion,
    onRefresh
  } = useGratificaciones();

  const [filter, setFilter] = useState<'todos' | 'pendiente' | 'por_pagar' | 'pagado' | 'rechazada'>('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<GratificacionEmployee | null>(null);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const bg = theme.isDark ? '#000000' : '#FFFFFF';
  const cardBg = theme.isDark ? '#111111' : '#F3F4F6';
  const textPrimary = theme.isDark ? '#FFFFFF' : '#111827';
  const textSecondary = theme.isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = theme.isDark ? `${theme.accentColor}40` : '#E2E8F0';

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

  return {
    ...theme,
    gratificaciones,
    employees,
    loading,
    refreshing,
    submitting,
    error,
    onRefresh,
    filter,
    setFilter,
    modalVisible,
    setModalVisible,
    employeeSearch,
    setEmployeeSearch,
    selectedEmployee,
    setSelectedEmployee,
    monto,
    setMonto,
    descripcion,
    setDescripcion,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
    filteredEmployees,
    filteredData,
    totals,
    handleMontoChange,
    resetForm,
    handleSubmit
  };
}
