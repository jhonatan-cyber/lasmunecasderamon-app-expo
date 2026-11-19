import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { ModalBottomSheet } from '@/components/ui/ModalBottomSheet';
import type { AcompanamientoOpcion } from '@/services/colaciones';

interface Props {
  acompanamientos: AcompanamientoOpcion[];
  selectedId: string;
  loading: boolean;
  error?: string | null;
  /** Unidades de acompañamiento que la bebida requiere. */
  unidadesRequeridas?: number;
  /** Ml por unidad de acompañamiento configurado en la transferencia. */
  mlPorUnidad?: number | null;
  onSelect: (id: string) => void;
}

export const ColacionAcompanamientoSelector: React.FC<Props> = ({
  acompanamientos,
  selectedId,
  loading,
  error,
  unidadesRequeridas,
  mlPorUnidad,
  onSelect,
}) => {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const [modalVisible, setModalVisible] = React.useState(false);

  // El acompañamiento seleccionado para mostrar en el botón.
  const selectedAcompanamiento = acompanamientos.find(
    (a) => String(a.id) === selectedId
  );

  // Ml total a descontar del acompañamiento (unidades × ml por unidad).
  const mlATotales = mlPorUnidad != null ? mlPorUnidad * (unidadesRequeridas ?? 0) : null;

  const handleSelect = React.useCallback((id: string) => {
    onSelect(id);
    setModalVisible(false);
  }, [onSelect]);

  // Info de ml restante debajo del botón cuando hay selección.
  const infoLinea = React.useMemo(() => {
    if (!selectedAcompanamiento) return null;
    const parte = mlATotales !== null
      ? `Se descontarán ${mlATotales} ml`
      : `Se descontarán ${unidadesRequeridas ?? 0} unidades`;
    const mlRest = Number(selectedAcompanamiento.ml ?? 0);
    const resto = mlRest > 0 ? ` · quedan ${mlRest} ml en botellas abiertas` : '';
    return parte + resto + '.';
  }, [selectedAcompanamiento, mlATotales, unidadesRequeridas]);

  const subtitleText = `Incluye ${unidadesRequeridas ?? 0} bebida{(unidadesRequeridas ?? 0) === 1 ? '' : 's'}${mlPorUnidad !== null ? ` de ${mlPorUnidad} ml` : ''} por botella.`;

  return (
    <>
      <View style={styles.wrap}>
        <Text style={[styles.label, { color: textPrimary }]}>Acompañamiento</Text>
        <Pressable
          onPress={() => !loading && acompanamientos.length > 0 && setModalVisible(true)}
          style={[styles.selectButton, { borderColor, opacity: loading || acompanamientos.length === 0 ? 0.5 : 1 }]}
        >
          <Text
            style={[
              styles.selectButtonText,
              { color: selectedAcompanamiento ? textPrimary : textSecondary },
            ]}
          >
            {selectedAcompanamiento
              ? `${selectedAcompanamiento.presentacion_nombre || selectedAcompanamiento.nombre}`
              : 'Selecciona acompañamiento'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={textSecondary} />
        </Pressable>
        {infoLinea && (
          <Text style={[styles.info, { color: textSecondary }]}>{infoLinea}</Text>
        )}
        {loading ? (
          <Text style={[styles.hint, { color: textSecondary }]}>Cargando opciones…</Text>
        ) : error ? (
          <Text style={[styles.error, { color: '#EF4444' }]}>{error}</Text>
        ) : acompanamientos.length === 0 ? (
          <Text style={[styles.hint, { color: textSecondary }]}>
            Sin bebidas con stock suficiente para acompañar.
          </Text>
        ) : null}
      </View>

      <ModalBottomSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Acompañamiento"
        subtitle={subtitleText}
      >
        <FlatList
          data={acompanamientos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const isSelected = String(item.id) === selectedId;
            const stockBar = item.stock ?? 0;
            const mlAbierto = item.ml ?? 0;
            return (
              <Pressable
                accessibilityLabel={`${item.nombre}, stock ${stockBar}${mlAbierto > 0 ? `, ${mlAbierto} ml abiertos` : ''}`}
                onPress={() => handleSelect(String(item.id))}
                style={[
                  styles.listItem,
                  {
                    backgroundColor: cardBg,
                    borderColor,
                    borderWidth: isSelected ? 2 : 1,
                    borderLeftWidth: isSelected ? 4 : 1,
                    borderLeftColor: isSelected ? accentColor : borderColor,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listItemName, { color: textPrimary }]}>
                    {item.presentacion_nombre || item.nombre}
                  </Text>
                  <Text style={[styles.listItemMeta, { color: textSecondary }]}>
                    {stockBar} en bar
                    {mlAbierto > 0 ? ` · ${mlAbierto} ml abiertos` : ''}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={accentColor} />
                )}
              </Pressable>
            );
          }}
          style={{ flex: 1 }}
        />
      </ModalBottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
  },
  info: {
    fontSize: 11,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  listItemMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default ColacionAcompanamientoSelector;
