import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { showToast } from '@/utils/toast-lazy';

interface QRPermissionViewProps {
  visible: boolean;
  canAskAgain: boolean;
  requestPermission: () => void;
  onClose: () => void;
}

export const QRPermissionView: React.FC<QRPermissionViewProps> = ({
  visible,
  canAskAgain,
  requestPermission,
  onClose,
}) => {
  if (!visible) return null;

  return (
      <Modal visible animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera" size={60} color="#60A5FA" />
          <Text style={styles.title}>Permiso de Cámara</Text>
          <Text style={styles.message}>
            Necesitamos acceso a tu cámara para escanear el código QR de asistencia.
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
                      text2: 'Abre Ajustes manualmente y habilita la cámara para esta app.'
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
};

const styles = StyleSheet.create({
  container: {
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
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 20,
    textAlign: 'center',
  },
  message: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    marginBottom: 30,
  },
  btn: {
    backgroundColor: '#60A5FA',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 9999,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    marginTop: 15,
    padding: 10,
  },
  closeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
});
