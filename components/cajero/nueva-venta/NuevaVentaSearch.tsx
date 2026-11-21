import React from 'react';
import { BorderRadius } from '@/constants/spacing';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useConfigValue } from '@/hooks/useConfigValue';
import { formatBotellaAbierta } from '@/hooks/utils/cartUtils';
import { resolverVentaProducto } from '@/hooks/utils/saleChoice';
import { SaleFormatSelector } from '@/components/cajero/nueva-venta/SaleFormatSelector';

interface NuevaVentaSearchProps {
  searchProducto: string;
  onSearchChange: (value: string) => void;
  onSearchNow: () => void;
  onClearSearch: () => void;
  searchLoading: boolean;
  searchResults: any[];
  cart: any[];
  onAddProduct: (item: any, choice: any, quantity: number) => void;
  onRemoveFromCart: (item: any, choice: any) => void;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

/**
 * Búsqueda de productos del bar (`GET /products?for_sale=1&term=`, debounce
 * de 300 ms) con los mismos estados que `NewSaleSearch` del dashboard:
 * «Buscando...» y «No hay resultados», más el botón «Limpiar».
 *
 * Cada resultado muestra —como el buscador del dashboard— la botella abierta
 * en el bar, los shots aproximados que quedan en ella y, si la presentación
 * ofrece más de una forma de venta, el selector Botella / Shot cliente /
 * Shot anfitriona.
 */
export const NuevaVentaSearch: React.FC<NuevaVentaSearchProps> = ({
  searchProducto,
  onSearchChange,
  onSearchNow,
  onClearSearch,
  searchLoading,
  searchResults,
  cart,
  onAddProduct,
  onRemoveFromCart,
  accentColor,
  cardBg,
  textPrimary,
  textSecondary,
  borderColor,
}) => {
  const hasText = searchProducto.trim().length > 0;
  // Ml por shot global de Configuraciones; cada presentación puede traer el suyo.
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      <Text style={[styles.title, { color: textPrimary }]}>Buscar Producto</Text>

      <View style={styles.inputRow}>
        <Ionicons name="search" size={18} color={textSecondary} />
        <TextInput
          style={[styles.input, { color: textPrimary, borderColor, paddingRight: hasText ? 36 : 12 }]}
          placeholder="Buscar Producto"
          placeholderTextColor={textSecondary}
          value={searchProducto}
          onChangeText={onSearchChange}
          onSubmitEditing={onSearchNow}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Buscar Producto"
        />
        {hasText && (
          <Pressable
            onPress={onClearSearch}
            style={styles.clearIconBtn}
            accessibilityLabel="Limpiar búsqueda"
            accessibilityRole="button"
          >
            <Ionicons name="close-circle" size={20} color={textSecondary} />
          </Pressable>
        )}
      </View>

      {hasText && (
        <View style={styles.results}>
          {searchLoading ? (
            <View style={styles.stateRow}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={[styles.stateText, { color: textSecondary }]}>Buscando...</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <Text style={[styles.stateText, { color: textSecondary, textAlign: 'center' }]}>
              No hay resultados
            </Text>
          ) : (
            searchResults.map((producto: any, idx: number) => {
              const venta = resolverVentaProducto(producto);
              const categoria = String(producto.categoria || '');
              const botellaAbierta = formatBotellaAbierta(
                producto.ml_abierta,
                producto.ml_shot,
                shotMl,
              );
              return (
                <View
                  key={String(producto.id || producto.id_producto || idx)}
                  style={[styles.resultRow, { borderBottomColor: borderColor }]}
                >
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: textPrimary }]} numberOfLines={1}>
                      {producto.nombre || producto.name || 'Producto'}
                    </Text>
                    <Text style={[styles.resultMeta, { color: textSecondary }]} numberOfLines={1}>
                      {categoria}
                    </Text>
                    {botellaAbierta && (
                      <Text style={styles.resultOpenBottle} numberOfLines={1}>
                        {botellaAbierta}
                      </Text>
                    )}
                    <SaleFormatSelector
                      product={producto}
                      options={venta.opciones}
                      shotMl={shotMl}
                      accentColor={accentColor}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                      borderColor={borderColor}
                      cardBg={cardBg}
                      cart={cart}
                      onAdd={(choice, quantity) => onAddProduct(producto, choice, quantity)}
                      onRemove={(choice) => onRemoveFromCart(producto, choice)}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  clearIconBtn: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  results: {
    marginTop: 14,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  stateText: {
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '800',
  },
  resultMeta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  resultOpenBottle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    color: '#F59E0B',
  },
});
