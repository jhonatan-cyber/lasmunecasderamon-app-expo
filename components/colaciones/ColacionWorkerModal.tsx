import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

interface Worker {
  id: string;
  name: string;
  lastName: string;
  nick?: string;
  selected?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  workers: Worker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  error?: string | null;
}

export const ColacionWorkerModal: React.FC<Props> = ({
  visible,
  onClose,
  workers,
  selectedId,
  onSelect,
}) => {
  const { accentColor, textPrimary, textSecondary, borderColor } = useAccentColor();
  const selectedWorker = workers.find((w) => w.id === selectedId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { borderColor }]}>
          <Text style={[styles.title, { color: textPrimary }]}>Seleccionar trabajador</Text>
          <Text style={{ color: textSecondary, marginBottom: 8 }}>
            Un corto por turno. Selecciona el trabajador que recibe el acompañamiento.
          </Text>
          {workers.length === 0 ? (
            <Text style={{ color: textSecondary, textAlign: 'center' }}>Sin trabajadores cercanos.</Text>
          ) : (
            workers.map((w) => {
              const isSelected = w.id === selectedId;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => {
                    onSelect(w.id);
                    onClose();
                  }}
                  style={[styles.row, isSelected && { backgroundColor: accentColor + '18' }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nameText, { color: textPrimary }]}>
                      {w.name} {w.lastName}
                      {w.nick ? ` · ${w.nick}` : ''}
                    </Text>
                  </View>
                  {isSelected && (
                    <Text style={{ color: accentColor, fontWeight: '800' }}>✓</Text>
                  )}
                </Pressable>
              );
            })
          )}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <Pressable onPress={onClose} style={[styles.buttonOutline, { borderColor }]}>
              <Text style={{ color: textSecondary }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    maxHeight: '80%',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  buttonOutline: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
