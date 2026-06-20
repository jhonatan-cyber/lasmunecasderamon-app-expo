import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GratificacionEmployee } from '@/hooks/useGratificaciones';

interface NuevaGratificacionModalProps {
  visible: boolean;
  isDark: boolean;
  bg: string;
  cardBg: string;
  borderColor: string;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  employeeSearch: string;
  setEmployeeSearch: (text: string) => void;
  filteredEmployees: GratificacionEmployee[];
  selectedEmployee: GratificacionEmployee | null;
  setSelectedEmployee: (emp: GratificacionEmployee) => void;
  monto: string;
  handleMontoChange: (text: string) => void;
  descripcion: string;
  setDescripcion: (text: string) => void;
  submitting: boolean;
  handleSubmit: () => Promise<void>;
  onClose: () => void;
}

export function NuevaGratificacionModal({
  visible,
  isDark,
  bg,
  cardBg,
  borderColor,
  accentColor,
  textPrimary,
  textSecondary,
  employeeSearch,
  setEmployeeSearch,
  filteredEmployees,
  selectedEmployee,
  setSelectedEmployee,
  monto,
  handleMontoChange,
  descripcion,
  setDescripcion,
  submitting,
  handleSubmit,
  onClose
}: NuevaGratificacionModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: bg }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Nueva Gratificación</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
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
  );
}

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end' 
  },
  modalBackdrop: { 
    ...StyleSheet.absoluteFill, 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
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
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '800' 
  },
  closeButton: { 
    padding: 8, 
    borderRadius: 9999, 
    backgroundColor: 'rgba(128,128,128,0.15)' 
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16
  },
  textArea: { 
    height: 84, 
    textAlignVertical: 'top' 
  },
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
  employeeRowName: { 
    fontSize: 14, 
    fontWeight: '700' 
  },
  employeeRowMeta: { 
    fontSize: 12, 
    marginTop: 2 
  },
  submitButton: {
    borderRadius: 9999,
    padding: 18,
    alignItems: 'center',
    marginTop: 4
  },
  submitButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '800' 
  }
});
