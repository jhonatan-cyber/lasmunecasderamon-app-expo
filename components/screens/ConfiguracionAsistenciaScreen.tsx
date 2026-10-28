import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  useConfiguracionAsistencia,
  type PantallaAsistencia,
} from '@/hooks/useConfiguracionAsistencia';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { duracionVentana, formatearHora, leerHora } from '@/utils/asistenciaConfig';
import { showToast } from '@/utils/toast-lazy';

export default function ConfiguracionAsistenciaScreen() {
  const esAdmin = useIsAdmin();

  if (!esAdmin) return <AccesoRestringido />;

  return <PanelConfiguracionAsistencia />;
}

function AccesoRestringido() {
  const router = useRouter();
  const { bg, cardBg, textPrimary, textSecondary } = useAccentColor();

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Configuración"
        subtitle="Acceso restringido"
        onBack={() => router.back()}
      />
      <View style={[styles.card, styles.restrictedCard, { backgroundColor: cardBg }]}>
        <Ionicons name="lock-closed" size={48} color={textSecondary} />
        <Text style={[styles.restrictedTitle, { color: textPrimary }]}>
          Solo administradores
        </Text>
        <Text style={[styles.restrictedText, { color: textSecondary }]}>
          Esta configuración de asistencia está reservada a usuarios con rol
          administrador.
        </Text>
      </View>
    </View>
  );
}

function PanelConfiguracionAsistencia() {
  const router = useRouter();
  const { accentColor, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } =
    useAccentColor();

  const {
    ventana,
    setVentana,
    sucio,
    valida,
    loadingVentana,
    saving,
    guardarVentana,
    pantallas,
    loadingPantallas,
    allowed,
    errorPantallas,
    revocando,
    cargarPantallas,
    revocarPantalla,
  } = useConfiguracionAsistencia();

  const [inicioTexto, setInicioTexto] = useState<string | null>(null);
  const [finTexto, setFinTexto] = useState<string | null>(null);

  const valorInicio =
    inicioTexto ??
    formatearHora(ventana.asistencia_hora_inicio, ventana.asistencia_minuto_inicio);
  const valorFin =
    finTexto ?? formatearHora(ventana.asistencia_hora_fin, ventana.asistencia_minuto_fin);

  const cambiarInicio = (texto: string) => {
    setInicioTexto(texto);
    const partes = leerHora(texto);
    if (partes) {
      setVentana((prev) => ({
        ...prev,
        asistencia_hora_inicio: partes.hora,
        asistencia_minuto_inicio: partes.minuto,
      }));
    }
  };

  const cambiarFin = (texto: string) => {
    setFinTexto(texto);
    const partes = leerHora(texto);
    if (partes) {
      setVentana((prev) => ({
        ...prev,
        asistencia_hora_fin: partes.hora,
        asistencia_minuto_fin: partes.minuto,
      }));
    }
  };

  const onGuardar = async () => {
    const ok = await guardarVentana();
    if (ok) {
      setInicioTexto(null);
      setFinTexto(null);
    }
    showToast(
      ok
        ? { type: 'success', text1: 'Ventana de asistencia guardada' }
        : { type: 'error', text1: 'No se pudo guardar la configuración' },
    );
  };

  const confirmarRevocar = (pantalla: PantallaAsistencia) => {
    Alert.alert(
      'Desvincular pantalla',
      `¿Desvincular "${pantalla.nombre}" de la asistencia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: () => {
            void revocarPantalla(pantalla.id).then((ok) =>
              showToast(
                ok
                  ? { type: 'success', text1: 'Pantalla desvinculada' }
                  : { type: 'error', text1: 'No se pudo desvincular' },
              ),
            );
          },
        },
      ],
    );
  };

  const duracion = duracionVentana(ventana);
  const minutosInicio = ventana.asistencia_minuto_inicio;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Configuración"
        subtitle="Asistencia"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={20} color={textSecondary} />
            <Text style={[styles.cardTitle, { color: textPrimary }]}>
              Ventana de asistencia
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: textSecondary }]}>
            Rango en el que se aceptan marcas de entrada y salida. Fuera de él el
            sistema guarda la ubicación pero no computa la asistencia del día.
          </Text>

          {loadingVentana ? (
            <View style={styles.skeletonStack}>
              <SkeletonLoader width="100%" height={72} borderRadius={16} />
              <SkeletonLoader width="100%" height={44} borderRadius={16} />
            </View>
          ) : (
            <>
              <View style={styles.inputsRow}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textSecondary }]}>
                    Hora de inicio (entrada)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: bg, color: textPrimary, borderColor },
                    ]}
                    value={valorInicio}
                    onChangeText={cambiarInicio}
                    onBlur={() => setInicioTexto(null)}
                    placeholder="HH:MM"
                    placeholderTextColor={textSecondary}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    accessibilityLabel="Hora de inicio de la ventana de asistencia"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textSecondary }]}>
                    Hora de fin (salida / corte)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: bg, color: textPrimary, borderColor },
                    ]}
                    value={valorFin}
                    onChangeText={cambiarFin}
                    onBlur={() => setFinTexto(null)}
                    placeholder="HH:MM"
                    placeholderTextColor={textSecondary}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    accessibilityLabel="Hora de fin de la ventana de asistencia"
                  />
                </View>
              </View>

              <View
                style={[
                  styles.previewRow,
                  { borderColor, backgroundColor: isDark ? '#000000' : '#F9FAFB' },
                ]}
              >
                <Text style={[styles.previewLabel, { color: textSecondary }]}>
                  Ventana actual
                </Text>
                <Text
                  style={[
                    styles.previewValue,
                    { color: valida ? textPrimary : '#B45309' },
                  ]}
                >
                  {valida
                    ? `${formatearHora(
                      ventana.asistencia_hora_inicio,
                      minutosInicio,
                    )} → ${formatearHora(
                      ventana.asistencia_hora_fin,
                      ventana.asistencia_minuto_fin,
                    )} · ${Math.floor(duracion / 60)} h ${duracion % 60} min`
                    : 'Ventana vacía'}
                </Text>
              </View>

              {!valida && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={16} color="#B45309" />
                  <Text style={styles.warningText}>
                    La hora de fin debe ser posterior a la hora de inicio. Con este
                    rango no entraría ninguna marca y nadie podría registrar
                    asistencia.
                  </Text>
                </View>
              )}

              <Pressable
                onPress={onGuardar}
                disabled={saving || !sucio || !valida}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: accentColor,
                    opacity: saving || !sucio || !valida ? 0.5 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: saving || !sucio || !valida }}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.saveButtonText}>
                  {saving ? 'Guardando...' : 'Guardar configuración'}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="tv-outline" size={20} color={textSecondary} />
            <Text style={[styles.cardTitle, { color: textPrimary }]}>
              Pantallas de asistencia
            </Text>
          </View>
          <Text style={[styles.cardDescription, { color: textSecondary }]}>
            Dispositivos del local vinculados sin claves. La autorización se renueva
            automáticamente mientras se utilizan.
          </Text>

          {!allowed ? (
            <Text style={[styles.cardDescription, { color: textSecondary }]}>
              No tenés permisos de administrador para ver las pantallas vinculadas.
            </Text>
          ) : loadingPantallas ? (
            <View style={styles.skeletonStack}>
              <SkeletonLoader width="100%" height={64} borderRadius={16} />
              <SkeletonLoader width="100%" height={64} borderRadius={16} />
            </View>
          ) : errorPantallas ? (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, { color: '#EF4444' }]}>
                {errorPantallas}
              </Text>
              <Pressable onPress={() => void cargarPantallas()} style={styles.retryButton}>
                <Text style={[styles.retryText, { color: accentColor }]}>
                  Reintentar
                </Text>
              </Pressable>
            </View>
          ) : pantallas.length === 0 ? (
            <Text style={[styles.cardDescription, { color: textSecondary }]}>
              Todavía no hay pantallas vinculadas.
            </Text>
          ) : (
            pantallas.map((pantalla) => (
              <View
                key={pantalla.id}
                style={[styles.deviceRow, { borderColor }]}
              >
                <View style={styles.deviceInfo}>
                  <Text style={[styles.deviceName, { color: textPrimary }]}>
                    {pantalla.nombre}
                  </Text>
                  <Text style={[styles.deviceMeta, { color: textSecondary }]}>
                    Último uso: {pantalla.ultimo_uso || 'sin registro'}
                  </Text>
                  <Text style={[styles.deviceMeta, { color: textSecondary }]}>
                    {pantalla.revocado_en
                      ? 'Desvinculada'
                      : pantalla.activo
                        ? 'Vinculada · Renovación automática'
                        : 'Inactiva: vuelve a activarla en el dispositivo'}
                  </Text>
                </View>

                {!pantalla.revocado_en && (
                  <Pressable
                    onPress={() => confirmarRevocar(pantalla)}
                    disabled={revocando !== null}
                    style={[styles.revokeButton, { borderColor: accentColor }]}
                    accessibilityRole="button"
                  >
                    {revocando === pantalla.id ? (
                      <ActivityIndicator color={accentColor} size="small" />
                    ) : (
                      <Text style={[styles.revokeText, { color: accentColor }]}>
                        Desvincular
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  cardDescription: { fontSize: 13, lineHeight: 19 },
  restrictedCard: { margin: 16, alignItems: 'center', gap: 12, paddingVertical: 40 },
  restrictedTitle: { fontSize: 18, fontWeight: '800' },
  restrictedText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  skeletonStack: { gap: 10 },
  inputsRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1, gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: '700' },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  previewLabel: { fontSize: 12, fontWeight: '700' },
  previewValue: { fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#B45309' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 9999,
    paddingVertical: 14,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  deviceInfo: { flex: 1, gap: 2 },
  deviceName: { fontSize: 14, fontWeight: '800' },
  deviceMeta: { fontSize: 11 },
  revokeButton: {
    borderWidth: 1.5,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  revokeText: { fontSize: 12, fontWeight: '800' },
  errorBox: { gap: 8 },
  errorText: { fontSize: 13 },
  retryButton: { alignSelf: 'flex-start' },
  retryText: { fontSize: 13, fontWeight: '800' },
});
