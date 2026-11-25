import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  useConfiguracionAsistencia,
  type PantallaAsistencia,
} from '@/hooks/useConfiguracionAsistencia';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import {
  RUTA_PANTALLA_ASISTENCIA,
  useModoPantallaStore,
} from '@/store/modoPantallaStore';
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
  const activarModoPantalla = useModoPantallaStore((state) => state.activar);
  const { accentColor, bg, cardBg, surfaceMuted, textPrimary, textSecondary, borderColor, accentOnSurface, accentText, accentUi, accentBg } =
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
    activando,
    cargarPantallas,
    activarPantalla,
    revocarPantalla,
  } = useConfiguracionAsistencia();

  const [inicioTexto, setInicioTexto] = useState<string | null>(null);
  const [finTexto, setFinTexto] = useState<string | null>(null);
  const [nombrePantalla, setNombrePantalla] = useState('');
  const [confirmacionActivacion, setConfirmacionActivacion] = useState<string | null>(null);
  const [confirmacionRevocacion, setConfirmacionRevocacion] =
    useState<PantallaAsistencia | null>(null);

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

  const nombreValido = nombrePantalla.trim().length > 0;

  const confirmarActivacion = () => {
    const nombre = nombrePantalla.trim();
    if (!nombre) return;
    setConfirmacionActivacion(nombre);
  };

  const activarEstaPantalla = async () => {
    const nombre = confirmacionActivacion;
    setConfirmacionActivacion(null);
    if (!nombre) return;

    const ok = await activarPantalla(nombre);
    if (!ok) {
      showToast({ type: 'error', text1: 'No se pudo activar la pantalla' });
      return;
    }

    setNombrePantalla('');
    showToast({ type: 'success', text1: 'Pantalla activada' });
    await activarModoPantalla(nombre);
    router.replace(RUTA_PANTALLA_ASISTENCIA);
  };

  const confirmarRevocar = (pantalla: PantallaAsistencia) => {
    setConfirmacionRevocacion(pantalla);
  };

  const revocarEstaPantalla = async () => {
    const pantalla = confirmacionRevocacion;
    setConfirmacionRevocacion(null);
    if (!pantalla) return;

    const ok = await revocarPantalla(pantalla.id);
    showToast(
      ok
        ? { type: 'success', text1: 'Pantalla desvinculada' }
        : { type: 'error', text1: 'No se pudo desvincular' },
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={20} color={textSecondary} />
            <Text style={[styles.cardTitle, { color: textPrimary }]}>
              Ventana de asistencia
            </Text>
          </View>
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
                    Entrada
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
                    Salida / corte
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
                  { borderColor, backgroundColor: surfaceMuted },
                ]}
              >
                <Text style={[styles.previewLabel, { color: textSecondary }]}>
                  Ventana actual
                </Text>
                <Text
                  style={[
                    styles.previewValue,
                    { color: valida ? textPrimary : accentUi },
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
                <View style={[styles.warningBox, { backgroundColor: accentBg }]}>
                  <Ionicons name="warning-outline" size={16} color={accentUi} />
                  <Text style={[styles.warningText, { color: accentUi }]}>
                    La hora de fin debe ser posterior a la de inicio.
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
                  <ActivityIndicator color={accentText} />
                ) : (
                  <Ionicons name="save-outline" size={18} color={accentText} />
                )}
                <Text style={[styles.saveButtonText, { color: accentText }]}>
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

          {allowed && (
            <View style={styles.activacionBox}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>
                Nombre de esta pantalla
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: bg, color: textPrimary, borderColor },
                ]}
                value={nombrePantalla}
                onChangeText={setNombrePantalla}
                placeholder="Ej. Entrada del local"
                placeholderTextColor={textSecondary}
                maxLength={100}
                editable={!activando}
                accessibilityLabel="Nombre de esta pantalla de asistencia"
              />
              <Pressable
                onPress={confirmarActivacion}
                disabled={activando || !nombreValido}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: accentColor,
                    opacity: activando || !nombreValido ? 0.5 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: activando || !nombreValido }}
              >
                {activando ? (
                  <ActivityIndicator color={accentText} size="small" />
                ) : (
                  <Ionicons name="tablet-portrait-outline" size={18} color={accentText} />
                )}
                <Text style={[styles.saveButtonText, { color: accentText }]}>
                  {activando ? 'Activando...' : 'Activar pantalla de asistencia'}
                </Text>
              </Pressable>
            </View>
          )}

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
            <ErrorState
              variant="inline"
              icon="warning-outline"
              title="Error al cargar pantallas"
              message={errorPantallas}
              retryLabel="Reintentar"
              onRetry={() => void cargarPantallas()}
            />
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
                    accessibilityLabel={`Desvincular pantalla ${pantalla.nombre ?? ''}`}
                    accessibilityState={{ disabled: revocando !== null }}
                  >
                    {revocando === pantalla.id ? (
                      <ActivityIndicator color={accentOnSurface} size="small" />
                    ) : (
                      <Text style={[styles.revokeText, { color: accentOnSurface }]}>
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
      </KeyboardAvoidingView>

      <PremiumAlert
        visible={confirmacionActivacion !== null}
        type="info"
        title="Activar pantalla de asistencia"
        message={`Este dispositivo quedará vinculado como "${confirmacionActivacion ?? ''}" y pasará a mostrar la asistencia del personal. Podrás salir del modo pantalla desde el botón "Salir", que cierra la sesión.`}
        confirmText="Activar"
        cancelText="Cancelar"
        showCancel
        onConfirm={() => void activarEstaPantalla()}
        onCancel={() => setConfirmacionActivacion(null)}
      />

      <PremiumAlert
        visible={confirmacionRevocacion !== null}
        type="danger"
        title="Desvincular pantalla"
        message={`¿Desvincular "${confirmacionRevocacion?.nombre ?? ''}" de la asistencia? El dispositivo dejará de estar autorizado para registrar asistencia.`}
        confirmText="Sí, desvincular"
        cancelText="Cancelar"
        showCancel
        onConfirm={() => void revocarEstaPantalla()}
        onCancel={() => setConfirmacionRevocacion(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  card: {
    borderRadius: BorderRadius.card,
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
  inputsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  inputGroup: { flex: 1, gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: '700', lineHeight: 16, textTransform: 'uppercase', letterSpacing: 0.4 },
  activacionBox: { gap: 10 },
  input: {
    borderWidth: 2,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: BorderRadius.card,
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
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 17 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BorderRadius.full,
    paddingVertical: 14,
  },
  saveButtonText: { fontSize: 15, fontWeight: '800' },
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
    borderWidth: 2,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  revokeText: { fontSize: 12, fontWeight: '800' },
});
