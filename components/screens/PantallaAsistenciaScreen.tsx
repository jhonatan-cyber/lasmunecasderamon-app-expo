import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FlashList from '@/components/shared/FlashList';
import { PersonalCard, PersonalQRModal } from '@/components/cajero/personal';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { usePersonalScreen } from '@/hooks/usePersonalScreen';
import { useAuthStore } from '@/store/authStore';
import { useModoPantallaStore } from '@/store/modoPantallaStore';

const GRID_PADDING = 16;
const GRID_GAP = 12;
const DANGER = '#EF4444';

function columnasParaAncho(ancho: number): number {
  if (ancho >= 900) return 4;
  if (ancho >= 640) return 3;
  return 2;
}

export default function PantallaAsistenciaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desactivar = useModoPantallaStore((state) => state.desactivar);
  const nombrePantalla = useModoPantallaStore((state) => state.nombre);
  const logout = useAuthStore((state) => state.logout);
  const [confirmacionSalida, setConfirmacionSalida] = useState(false);

  const {
    accentColor,
    accentBg,
    bg,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    loading,
    refreshing,
    searchTerm,
    setSearchTerm,
    selectedUser,
    setSelectedUser,
    isGenerating,
    codigoAsistencia,
    onRefresh,
    handleGenerateQR,
    filteredUsers,
  } = usePersonalScreen();

  const numColumns = columnasParaAncho(width);
  const cardWidth = useMemo(
    () => (width - GRID_PADDING * 2 - GRID_GAP * (numColumns - 1)) / numColumns,
    [width, numColumns],
  );

  const salirDelModoPantalla = useCallback(async () => {
    setConfirmacionSalida(false);
    await desactivar();
    await logout();
    router.replace('/(auth)/login');
  }, [desactivar, logout, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen
        options={{ headerShown: false, gestureEnabled: false, orientation: 'all' }}
      />

      <View
        style={[
          styles.cabecera,
          { backgroundColor: cardBg, borderColor, paddingTop: insets.top + 12 },
        ]}
      >
        <View style={styles.cabeceraInfo}>
          <View style={[styles.cabeceraIcono, { backgroundColor: accentBg }]}>
            <Ionicons name="tv-outline" size={22} color={accentColor} />
          </View>
          <View style={styles.cabeceraTextos}>
            <Text style={[styles.cabeceraTitulo, { color: textPrimary }]}>
              Asistencia
            </Text>
            <Text
              style={[styles.cabeceraSubtitulo, { color: textSecondary }]}
              numberOfLines={1}
            >
              {nombrePantalla || 'Pantalla vinculada'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setConfirmacionSalida(true)}
          style={[styles.salirBtn, { borderColor: DANGER }]}
          accessibilityRole="button"
          accessibilityLabel="Salir del modo pantalla"
        >
          <Ionicons name="log-out-outline" size={18} color={DANGER} />
          <Text style={[styles.salirTexto, { color: DANGER }]}>Salir</Text>
        </Pressable>
      </View>

      <View style={styles.resumen}>
        <Text style={[styles.ayuda, { color: textSecondary }]}>
          Toca a una persona para mostrar su QR de asistencia
        </Text>
        <View style={[styles.contador, { backgroundColor: accentBg }]}>
          <Ionicons name="people" size={14} color={accentColor} />
          <Text style={[styles.contadorTexto, { color: accentColor }]}>
            {filteredUsers.length}
          </Text>
        </View>
      </View>

      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor }]}>
          <Ionicons name="search" size={20} color={textSecondary} />
          <TextInput
            placeholder="Buscar por nombre o nick..."
            placeholderTextColor={textSecondary}
            style={[styles.searchInput, { color: textPrimary }]}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm !== '' && (
            <Pressable onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color={textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonLoader
              key={i}
              width={cardWidth - 12}
              height={160}
              borderRadius={20}
              style={{ margin: 6 }}
            />
          ))}
        </View>
      ) : (
        <FlashList
          key={`asistencia-grid-${numColumns}`}
          data={filteredUsers}
          keyExtractor={(item: any) => item.id.toString()}
          estimatedItemSize={180}
          numColumns={numColumns}
          contentContainerStyle={[
            styles.listContentGrid,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={accentColor}
            />
          }
          renderItem={({ item, index }: any) => (
            <PersonalCard
              item={item}
              index={index}
              cardWidth={cardWidth}
              setSelectedUser={setSelectedUser}
              cardBg={cardBg}
              borderColor={borderColor}
              accentColor={accentColor}
              accentBg={accentBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                {searchTerm
                  ? 'No se encontraron resultados'
                  : 'No hay personal registrado'}
              </Text>
            </View>
          }
        />
      )}

      <PersonalQRModal
        visible={!!selectedUser}
        selectedUser={selectedUser}
        onClose={() => setSelectedUser(null)}
        isGenerating={isGenerating}
        handleGenerateQR={handleGenerateQR}
        codigoAsistencia={codigoAsistencia}
        accentColor={accentColor}
        accentBg={accentBg}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />

      <PremiumAlert
        visible={confirmacionSalida}
        type="danger"
        title="Salir del modo pantalla"
        message="Se cerrará la sesión del dispositivo y volverás al inicio de sesión. Este equipo dejará de registrar asistencia."
        confirmText="Salir"
        cancelText="Cancelar"
        showCancel
        onConfirm={() => void salirDelModoPantalla()}
        onCancel={() => setConfirmacionSalida(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  cabeceraInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cabeceraIcono: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cabeceraTextos: { flex: 1 },
  cabeceraTitulo: { fontSize: 19, fontWeight: '900', letterSpacing: 0.2 },
  cabeceraSubtitulo: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  salirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  salirTexto: { fontSize: 13, fontWeight: '800' },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  ayuda: { flex: 1, fontSize: 13, fontWeight: '600' },
  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  contadorTexto: { fontSize: 13, fontWeight: '900' },
  searchBarContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  skeletonGrid: {
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listContentGrid: {
    paddingHorizontal: GRID_PADDING,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});
