import React from 'react';
import { BorderRadius } from '@/constants/spacing';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from '@/hooks/useAccentColor';

interface Worker {
  id: string;
  name: string;
  lastName: string;
  nick?: string;
  role?: string;
  roleId?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  workers: Worker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Colaciones ya recibidas por trabajador en el turno. */
  receivedCounts?: Record<string, number>;
  topesPorRol?: Record<string, number>;
  error?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  anfitriona: 'Anfitriona',
  cajero: 'Cajero',
  cajera: 'Cajera',
  garzon: 'Garzón',
  barman: 'Barman',
};

const roleLabel = (role?: string): string | null => {
  const key = (role ?? '').trim().toLowerCase();
  if (!key) return null;
  return ROLE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
};

const topePorRol = (roleId?: string, topesPorRol?: Record<string, number>): number => {
  const tope = roleId ? topesPorRol?.[roleId] : undefined;
  return typeof tope === 'number' && Number.isInteger(tope) && tope >= 0 ? tope : 1;
};

export const ColacionWorkerModal: React.FC<Props> = ({
  visible,
  onClose,
  workers,
  selectedId,
  onSelect,
  receivedCounts,
  topesPorRol,
  error,
}) => {
  const { accentColor, textPrimary, textSecondary, borderColor, cardBg, accentOnSurface } = useAccentColor();
  const trabajadoresDisponibles = workers.filter((worker) =>
    (receivedCounts?.[worker.id] ?? 0) < topePorRol(worker.roleId, topesPorRol)
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { borderColor, backgroundColor: cardBg }]}>
          <Text style={[styles.title, { color: textPrimary }]}>Seleccionar trabajador</Text>
          <Text style={{ color: textSecondary, marginBottom: 8 }}>
            Elige quién recibe la colación del turno.
          </Text>
          {error ? (
            <Text style={[styles.error, { color: accentOnSurface }]}>{error}</Text>
          ) : trabajadoresDisponibles.length === 0 ? (
            <Text style={{ color: textSecondary, textAlign: 'center' }}>
              No hay trabajadores disponibles.
            </Text>
          ) : (
            <FlatList
              data={trabajadoresDisponibles}
              keyExtractor={(w) => w.id}
              style={{ flexShrink: 1 }}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={8}
              windowSize={5}
              renderItem={({ item: w }) => {
                const isSelected = w.id === selectedId;
                const recibidas = receivedCounts?.[w.id] ?? 0;
                const tope = topePorRol(w.roleId, topesPorRol);
                const progreso = recibidas > 0 ? `Recibió ${recibidas} de ${tope}` : null;
                const rol = roleLabel(w.role);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${w.name} ${w.lastName}${rol ? `, ${rol}` : ''}${
                      progreso ? `, ${progreso}` : ''
                    }`}
                    onPress={() => {
                      onSelect(w.id);
                      onClose();
                    }}
                    style={[
                      styles.row,
                      { backgroundColor: cardBg },
                      isSelected && { backgroundColor: accentColor + '18' },
                    ]}
                  >
                    <View style={styles.rowText}>
                      <Text style={[styles.nameText, { color: textPrimary }]}>
                        {w.name} {w.lastName}
                        {w.nick ? ` · ${w.nick}` : ''}
                      </Text>
                      {rol || progreso ? (
                        <Text style={[styles.metaText, { color: textSecondary }]}>
                          {[rol, progreso].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Text style={{ color: accentOnSurface, fontWeight: '800' }}>✓</Text>
                    )}
                  </Pressable>
                );
              }}
            />
          )}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <Pressable onPress={onClose} style={[styles.buttonOutline, { borderColor }]} accessibilityRole="button" accessibilityLabel="Cancelar selección de trabajador">
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
    borderRadius: BorderRadius.card,
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
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 6,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
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
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
