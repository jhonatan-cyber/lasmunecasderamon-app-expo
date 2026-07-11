import { Ionicons } from '@expo/vector-icons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QRScannerOverlayProps {
  accentColor: string;
  zoom: number;
  codigo: string;
  loading: boolean;
  torch: boolean;
  onClose: () => void;
  onZoomToggle: () => void;
  onTorchToggle: () => void;
}

export const QRScannerOverlay: React.FC<QRScannerOverlayProps> = ({
  accentColor,
  zoom,
  codigo,
  loading,
  torch,
  onClose,
  onZoomToggle,
  onTorchToggle,
}) => (
  <View style={styles.overlay}>
    <View style={styles.header}>
      <Pressable onPress={onClose} style={styles.backButton}>
        <Ionicons name="close" size={28} color="#FFF" />
      </Pressable>
      <Text style={styles.headerTitle}>Escaneando QR</Text>
      <View style={styles.headerRight}>
        <Pressable
          onPress={onZoomToggle}
          style={[
            styles.backButton,
            zoom > 0 && { backgroundColor: '#34D399' },
            { marginRight: 8 }
          ]}
        >
          <Ionicons name="search" size={24} color="#FFF" />
        </Pressable>
        <Pressable
          onPress={onTorchToggle}
          style={[styles.backButton, torch && { backgroundColor: '#FBBF24' }]}
        >
          <Ionicons
            name={torch ? 'flashlight' : 'flashlight-outline'}
            size={24}
            color="#FFF"
          />
        </Pressable>
      </View>
    </View>

    <View style={styles.scannerContainer}>
      <AnimatedView
        from={{ scale: 0.9, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ loop: true, duration: 2000, type: 'timing' }}
        style={styles.scannerFrame}
      >
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        {loading && <ActivityIndicator size="large" color="#60A5FA" />}
      </AnimatedView>
    </View>

    <View style={styles.footer}>
      {codigo ? (
        <View style={[styles.codigoBadge, { borderColor: accentColor }]}>
          <Text style={styles.codigoLabel}>Código: </Text>
          <Text style={[styles.codigoValue, { color: accentColor }]}>{codigo}</Text>
        </View>
      ) : null}
      <Text style={styles.footerText}>
        {zoom > 0
          ? 'Modo macro activo. Aleja el QR unos 10–15 cm.'
          : 'Apunta al código QR a unos 15–25 cm de distancia.'}
      </Text>
      <TouchableOpacity style={styles.cerrarBtn} onPress={onClose}>
        <Text style={styles.cerrarBtnText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  scannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 280,
    height: 280,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#60A5FA',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 20,
  },
  footer: {
    paddingHorizontal: 40,
    gap: 10,
  },
  codigoBadge: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  codigoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
  codigoValue: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
  },
  footerText: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    borderRadius: 20,
  },
  cerrarBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 9999,
    alignItems: 'center',
    marginTop: 10,
  },
  cerrarBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
