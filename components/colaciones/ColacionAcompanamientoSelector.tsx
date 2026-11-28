import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BASE_URL } from '@/api/base-url';
import { useAccentColor } from '@/hooks/useAccentColor';
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

function productoFotoUrl(foto?: string | null) {
  const photo = foto && foto !== 'default.png' ? foto : 'default.png';
  return `${BASE_URL}/api/images/products/${encodeURIComponent(photo)}`;
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
  const { accentColor, accentOnSurface, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const [expanded, setExpanded] = React.useState(false);

  // El acompañamiento seleccionado para mostrar en el botón.
  const selectedAcompanamiento = acompanamientos.find(
    (a) => String(a.id) === selectedId
  );

  // Ml total a descontar del acompañamiento (unidades × ml por unidad).
  const mlATotales = mlPorUnidad != null ? mlPorUnidad * (unidadesRequeridas ?? 0) : null;

  const handleSelect = React.useCallback((id: string) => {
    // Pulsar la opción que ya está elegida la deselecciona.
    onSelect(id === selectedId ? '' : id);
    setExpanded(false);
  }, [onSelect, selectedId]);

  // Info de ml restante debajo del botón cuando hay selección.
  const infoLinea = React.useMemo(() => {
    if (!selectedAcompanamiento) return null;
    const parte = mlATotales !== null
      ? `Se descontarán ${mlATotales} ml`
      : `Se descontarán ${unidadesRequeridas ?? 0} unidades`;
    const mlRest = Number(selectedAcompanamiento.ml ?? 0);
    const resto = mlRest > 0
      ? ` · quedan ${mlRest.toLocaleString('es-CL')} ml disponibles en la botella abierta`
      : '';
    return parte + resto + '.';
  }, [selectedAcompanamiento, mlATotales, unidadesRequeridas]);

  const canOpen = !loading && acompanamientos.length > 0 && !error;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: textPrimary }]}>Acompañamiento</Text>
      <Pressable
        onPress={() => canOpen && setExpanded(!expanded)}
        style={[styles.selectButton, { borderColor, opacity: canOpen ? 1 : 0.5 }]}
      >
        <View style={styles.selectButtonContent}>
          {selectedAcompanamiento ? (
            <Image
              source={{ uri: productoFotoUrl(selectedAcompanamiento.producto_foto) }}
              style={styles.selectedImage}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              accessibilityLabel={selectedAcompanamiento.nombre}
            />
          ) : null}
          <Text
            style={[
              styles.selectButtonText,
              { color: selectedAcompanamiento ? textPrimary : textSecondary },
            ]}
            numberOfLines={1}
          >
            {selectedAcompanamiento
              ? selectedAcompanamiento.nombre
              : 'Selecciona acompañamiento'}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={textSecondary} />
      </Pressable>

      {expanded && canOpen && (
        <View style={[styles.dropdown, { backgroundColor: cardBg, borderColor }]}>
          {acompanamientos.map((item) => {
            const isSelected = String(item.id) === selectedId;
            const stockBar = item.stock ?? 0;
            const mlAbierto = item.ml ?? 0;
            return (
              <Pressable
                key={String(item.id)}
                accessibilityLabel={`${item.nombre}, stock ${stockBar} en bar${mlAbierto > 0 ? `, ${mlAbierto.toLocaleString('es-CL')} ml disponibles en botella abierta` : ''}`}
                onPress={() => handleSelect(String(item.id))}
                style={[
                  styles.listItem,
                  {
                    borderColor,
                    borderWidth: isSelected ? 2 : 1,
                    borderLeftWidth: isSelected ? 4 : 1,
                    borderLeftColor: isSelected ? accentColor : borderColor,
                  },
                ]}
              >
                <Image
                  source={{ uri: productoFotoUrl(item.producto_foto) }}
                  style={styles.listItemImage}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                  accessibilityLabel={item.nombre}
                />
                <View style={styles.listItemContent}>
                  <Text style={[styles.listItemName, { color: textPrimary }]}>
                    {item.nombre}
                  </Text>
                  <Text style={[styles.listItemMeta, { color: textSecondary }]}>
                    {stockBar} en bar
                    {mlAbierto > 0
                      ? ` · ${mlAbierto.toLocaleString('es-CL')} ml disponibles en botella abierta`
                      : ''}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={accentColor} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {infoLinea && (
        <Text style={[styles.info, { color: textSecondary }]}>{infoLinea}</Text>
      )}
      {loading ? (
        <Text style={[styles.hint, { color: textSecondary }]}>Cargando opciones…</Text>
      ) : error ? (
        <Text style={[styles.error, { color: accentOnSurface }]}>{error}</Text>
      ) : !expanded && acompanamientos.length === 0 ? (
        <Text style={[styles.hint, { color: textSecondary }]}>
          Sin bebidas con stock suficiente para acompañar.
        </Text>
      ) : null}
    </View>
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
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  selectButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  selectedImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
  dropdown: {
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    padding: 6,
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.card,
    gap: 10,
  },
  listItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  listItemContent: {
    flex: 1,
    minWidth: 0,
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
