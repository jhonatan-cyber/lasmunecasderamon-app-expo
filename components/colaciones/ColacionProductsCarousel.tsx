import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { mlDeColacion, acompanamientoDeColacion, type ColacionProducto } from '@/services/colaciones';
import { BASE_URL } from '@/api/base-url';

interface Props {
  products: ColacionProducto[];
  selectedId: string;
  loading: boolean;
  onSelect: (id: string) => void;
  /** Hint text shown below the grid (role-specific). */
  hint?: string;
}

function productoFotoUrl(foto?: string | null) {
  const photo = foto && foto !== 'default.png' ? foto : 'default.png';
  return `${BASE_URL}/api/images/products/${encodeURIComponent(photo)}`;
}

export const ColacionProductsCarousel: React.FC<Props> = ({
  products,
  selectedId,
  loading,
  onSelect,
  hint,
}) => {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor, surfaceMuted, accentText } = useAccentColor();
  const themeSecondary = textSecondary;
  return (
    <>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textPrimary }]}>Bebidas</Text>
        <Text style={[styles.count, { color: textSecondary }]}>
          {products.length} {products.length === 1 ? 'opción' : 'opciones'}
        </Text>
      </View>
      {loading ? (
        <View style={styles.loadingList}>
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: surfaceMuted }]} />
          ))}
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="beer-outline" size={24} color={themeSecondary} />
          <Text style={[styles.emptyText, { color: textSecondary }]}>
            Sin bebidas disponibles.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.list}>
            {products.map((product) => {
              const id = String(product.presentacion_id);
              const isSelected = id === selectedId;
              const ml = mlDeColacion(product);
              const mlBotella = Number(product.ml_botella ?? 0);
              const mlAbierto = Number(product.ml_abierta ?? 0);
              const stockBar = Number(product.stock_bar ?? product.stock ?? 0);
              const categoria = product.categoria_nombre ?? product.categoria ?? null;
              const fotoUrl = productoFotoUrl(product.producto_foto);
              const acompanamiento = acompanamientoDeColacion(product);
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`${product.producto_nombre} ${product.presentacion_nombre}, colación de ${ml} ml`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelect(id)}
                  style={[
                    styles.card,
                    {
                      borderColor: isSelected ? accentColor : borderColor,
                      backgroundColor: cardBg,
                      ...(isSelected ? styles.selectedRing : {}),
                    },
                  ]}
                >
                  <View style={[styles.cardImageWrap, { backgroundColor: surfaceMuted }]}>
                    {fotoUrl ? (
                      <Image
                        source={{ uri: fotoUrl }}
                        style={styles.cardImage}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={[styles.cardImagePlaceholder, { backgroundColor: surfaceMuted }]}>
                        <Ionicons name="beer-outline" size={24} color={themeSecondary} />
                      </View>
                    )}
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: accentColor }]}>
                        <Ionicons name="checkmark" size={12} color={accentText} />
                      </View>
                    )}
                  </View>
                  <View style={[styles.cardBody, { borderTopColor: surfaceMuted }]}>
                    <Text
                      style={[styles.cardProductName, { color: textPrimary }]}
                      numberOfLines={2}
                    >
                      {product.producto_nombre}
                    </Text>
                    <Text
                      style={[styles.cardPresentacion, { color: textSecondary }]}
                      numberOfLines={1}
                    >
                      {`${product.presentacion_nombre} · ${ml > 0 ? `${ml} ml` : 'sin ml'}`}
                    </Text>
                    <View style={styles.cardMetaRow}>
                      {categoria ? (
                        <Text style={[styles.metaChip, { color: textSecondary, borderColor }]}>
                          {categoria}
                        </Text>
                      ) : null}
                      {stockBar > 0 ? (
                        <Text style={[styles.metaChip, { color: textSecondary }]}>
                          {stockBar} en bar
                        </Text>
                      ) : null}
                      {mlAbierto > 0 ? (
                        <Text
                          style={[
                            styles.metaChip,
                            { color: textSecondary },
                          ]}
                        >
                          Abierta: {mlAbierto} ml
                        </Text>
                      ) : null}
                      {mlBotella > 0 ? (
                        <Text style={[styles.metaChip, { color: textSecondary }]}>
                          Producto: {mlBotella} ml
                        </Text>
                      ) : null}
                      {acompanamiento.unidades > 0 ? (
                        <Text style={[styles.metaChip, { color: textSecondary }]}>
                          Acomp: {acompanamiento.unidades}
                          {acompanamiento.ml !== null ? ` × ${acompanamiento.ml} ml` : ''}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {hint ? (
            <Text style={[styles.hint, { color: textSecondary }]}>{hint}</Text>
          ) : null}
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  count: {
    fontSize: 12,
    fontWeight: '500',
  },
  list: {
    gap: 10,
  },
  loadingList: {
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  selectedRing: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImageWrap: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    padding: 8,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 8,
    gap: 4,
    borderTopWidth: 1,
  },
  cardProductName: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '100%',
  },
  cardPresentacion: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  metaChip: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  skeletonCard: {
    height: 200,
    borderRadius: BorderRadius.full,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  hint: {
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
