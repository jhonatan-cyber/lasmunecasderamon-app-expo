import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { showToast } from '@/utils/toast-lazy';
import type { EnvaseVeredicto } from '@/hooks/useEnvasesScreen';

interface EnvaseScannerModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Procesa la lectura. Devuelve el veredicto para mostrarlo en pantalla, o
   * `null` si no se procesó (el código queda para reintentar a mano).
   */
  onScanned: (data: string) => Promise<EnvaseVeredicto | null>;
}

/** Pausa tras cada lectura para que la misma imagen no se relee en bucle. */
const COOLDOWN_MS = 1200;
/** Cuánto queda visible el veredicto antes de volver a escanear. */
const FEEDBACK_MS = 2500;

/**
 * Escáner de envases: lee EAN-13/EAN-8/Code128/QR con la cámara y mantiene la
 * cámara abierta para procesar varios envases seguidos, mostrando el veredicto
 * de cada lectura (patrón de escaneo continuo del dashboard, con su feedback
 * aquí en pantalla en vez de sonido).
 */
export const EnvaseScannerModal = ({ visible, onClose, onScanned }: EnvaseScannerModalProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [feedback, setFeedback] = useState<EnvaseVeredicto | null>(null);
  const busyRef = useRef(false);
  const cooldownRef = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setCameraActive(true), 300);
      return () => clearTimeout(timer);
    }
    // Las reservas van diferidas: igual que QRScannerModal, ningún setState
    // síncrono dentro del effect.
    const reset = setTimeout(() => {
      setCameraActive(false);
      setBusy(false);
      setFeedback(null);
      busyRef.current = false;
      cooldownRef.current = false;
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    }, 0);
    return () => clearTimeout(reset);
  }, [visible]);

  const mostrarFeedback = useCallback((veredicto: EnvaseVeredicto) => {
    setFeedback(veredicto);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      setFeedback(null);
      cooldownRef.current = false;
    }, veredicto.ok ? COOLDOWN_MS : FEEDBACK_MS);
  }, []);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (busyRef.current || cooldownRef.current) return;
      const codigo = (data ?? '').trim();
      if (!codigo) return;
      busyRef.current = true;
      setBusy(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        const veredicto = await onScanned(codigo);
        if (veredicto) {
          cooldownRef.current = true;
          mostrarFeedback(veredicto);
        }
      } catch {
        cooldownRef.current = true;
        mostrarFeedback({ ok: false, texto: 'No se pudo procesar la lectura. Intenta de nuevo.' });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [onScanned, mostrarFeedback],
  );

  if (!visible) return null;

  if (!permission) return <View style={styles.fullContainer} />;

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain ?? true;
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Ionicons name="camera" size={56} color="#60A5FA" />
            <Text style={styles.title}>Permiso de Cámara</Text>
            <Text style={styles.message}>
              Necesitamos acceso a tu cámara para escanear el código del envase.
            </Text>
            {canAskAgain ? (
              <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                <Text style={styles.btnText}>Conceder Permiso</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.message}>
                  El permiso fue denegado. Actívalo desde Ajustes para poder escanear.
                </Text>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => {
                    Linking.openSettings().catch(() => {
                      showToast({
                        type: 'error',
                        text1: 'No se pudo abrir Ajustes',
                        text2: 'Abre Ajustes manualmente y habilita la cámara.',
                      });
                    });
                  }}
                >
                  <Text style={styles.btnText}>Abrir Ajustes</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.fullContainer}>
        {cameraActive && (
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code39', 'code128', 'qr'] }}
            enableTorch={torch}
            autofocus="on"
          />
        )}

        <View style={styles.overlay}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.headerBtn}>
              <Ionicons name="close" size={28} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Escaneando envase</Text>
            <Pressable
              onPress={() => setTorch((prev) => !prev)}
              style={[styles.headerBtn, torch && { backgroundColor: '#FBBF24' }]}
            >
              <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color="#FFF" />
            </Pressable>
          </View>

          <View style={styles.scannerContainer}>
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {busy && <ActivityIndicator size="large" color="#60A5FA" />}
            </View>
          </View>

          <View style={styles.footer}>
            {feedback && (
              <View
                style={[
                  styles.feedback,
                  {
                    backgroundColor: feedback.ok ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
                  },
                ]}
              >
                <Ionicons
                  name={feedback.ok ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color="#FFF"
                />
                <Text style={styles.feedbackText} numberOfLines={3}>
                  {feedback.texto}
                </Text>
              </View>
            )}
            <Text style={styles.footerText}>
              Apunta al código del envase a unos 15–25 cm. La cámara sigue activa para el siguiente.
            </Text>
            <TouchableOpacity style={styles.cerrarBtn} onPress={onClose}>
              <Text style={styles.cerrarBtnText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 40,
  },
  permissionContent: {
    backgroundColor: '#1E1B4B',
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: { color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 14 },
  message: {
    color: '#C7D2FE',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    marginTop: 16,
  },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  closeBtn: { marginTop: 14, padding: 8 },
  closeText: { color: '#9CA3AF', fontWeight: '600', fontSize: 14 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headerBtn: {
    width: 46,
    height: 46,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  scannerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scannerFrame: {
    width: 260,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: '#60A5FA',
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  footer: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    alignItems: 'center',
    gap: 10,
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    borderRadius: 14,
    padding: 12,
  },
  feedbackText: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '700' },
  footerText: { color: '#D1D5DB', fontSize: 12, textAlign: 'center' },
  cerrarBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  cerrarBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
