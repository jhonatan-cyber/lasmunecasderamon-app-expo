import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface NuevaVentaSearchProps {
  searchProducto: string;
  onSearchChange: (value: string) => void;
  onSearchNow: () => void;
  onClearSearch: () => void;
  searchLoading: boolean;
  searchResults: any[];
  onAddProduct: (item: any) => void;
  isDark: boolean;
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
 */
export const NuevaVentaSearch: React.FC<NuevaVentaSearchProps> = ({
  searchProducto,
  onSearchChange,
  onSearchNow,
  onClearSearch,
  searchLoading,
  searchResults,
  onAddProduct,
  isDark,
  accentColor,
  cardBg,
  textPrimary,
  textSecondary,
  borderColor,
}) => {
  const hasText = searchProducto.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      <Text style={[styles.title, { color: textPrimary }]}>Buscar Producto</Text>

      <View style={styles.inputRow}>
        <Ionicons name="search" size={18} color={textSecondary} />
        <TextInput
          style={[styles.input, { color: textPrimary, borderColor }]}
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
        <Pressable
          onPress={onSearchNow}
          style={styles.searchBtn}
          accessibilityLabel="Buscar"
          accessibilityRole="button"
        >
          <Text style={styles.searchBtnText}>Buscar</Text>
        </Pressable>
        {hasText && (
          <Pressable
            onPress={onClearSearch}
            style={[styles.clearBtn, { borderColor }]}
            accessibilityLabel="Limpiar búsqueda"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={14} color={textPrimary} />
            <Text style={[styles.clearBtnText, { color: textPrimary }]}>Limpiar</Text>
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
              const precio = Number(producto.precio || producto.price || 0);
              const comision = Number(producto.comision || producto.commission || 0);
              const categoria = String(producto.categoria || '');
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
                      {[categoria, `Comisión $${comision.toLocaleString()}`].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={[styles.resultPrice, { color: accentColor }]}>
                    ${precio.toLocaleString()}
                  </Text>
                  <Pressable
                    onPress={() => onAddProduct(producto)}
                    style={[styles.addBtn, { backgroundColor: accentColor }]}
                    accessibilityLabel="Agregar producto"
                    accessibilityRole="button"
                    hitSlop={8}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </Pressable>
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
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  searchBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    backgroundColor: 'rgba(155,155,155,0.06)',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '800',
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
  resultPrice: {
    fontSize: 14,
    fontWeight: '900',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
