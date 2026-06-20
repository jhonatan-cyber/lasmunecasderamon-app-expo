import { Colors } from '@/constants/theme';
import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Timer } from '@/context/types';

interface ExpiredTimerModalProps {
  timer: Timer | null;
  onDismiss: () => void;
}

export function ExpiredTimerModal({ timer, onDismiss }: ExpiredTimerModalProps) {
  return (
    <Modal visible={!!timer} animationType="fade" transparent onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: Colors.dark.cardSecondary, borderRadius: 24, width: '100%', maxWidth: 380, overflow: 'hidden' }}>
          <View style={{ backgroundColor: Colors.dark.error, padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginBottom: 4 }}>⏰</Text>
            <Text style={{ color: Colors.dark.text, fontSize: 20, fontWeight: '800', textAlign: 'center' }}>¡Tiempo Terminado!</Text>
            <Text style={{ color: Colors.dark.errorLight, fontSize: 13, marginTop: 2, textAlign: 'center' }}>
              {timer?.tipoTransaccion === 'servicio'
                ? 'Servicio completado'
                : timer?.tipoTransaccion === 'venta'
                  ? 'Venta completada'
                  : 'Tiempo terminado'}
            </Text>
          </View>

          <View style={{ padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>🛏️</Text>
              <View>
                <Text style={{ color: Colors.dark.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Habitación</Text>
                <Text style={{ color: Colors.dark.text, fontSize: 17, fontWeight: '700' }}>{timer?.roomName || '—'}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>👤</Text>
              <View>
                <Text style={{ color: Colors.dark.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Cliente</Text>
                <Text style={{ color: Colors.dark.text, fontSize: 15 }}>{timer?.clienteNombre || '—'}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>
                {timer?.tipoTransaccion === 'venta' ? '🛒' : '🏠'}
              </Text>
              <View>
                <Text style={{ color: Colors.dark.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Tipo</Text>
                <Text style={{ color: Colors.dark.text, fontSize: 15, textTransform: 'capitalize' }}>
                  {timer?.tipoTransaccion === 'servicio'
                    ? 'Servicio'
                    : timer?.tipoTransaccion === 'venta'
                      ? 'Venta'
                      : '—'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>⏱️</Text>
              <View>
                <Text style={{ color: Colors.dark.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Duración</Text>
                <Text style={{ color: Colors.dark.text, fontSize: 15 }}>{timer?.duration || 0} minutos</Text>
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: Colors.dark.border, paddingTop: 12, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: Colors.dark.textMuted, fontSize: 12 }}>Código:</Text>
                <Text style={{ color: Colors.dark.text, fontSize: 13, fontFamily: 'monospace' }}>#{timer?.servicioCode || '—'}</Text>
              </View>
            </View>
          </View>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: Colors.dark.border }}>
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => ({
                backgroundColor: pressed ? Colors.dark.error : '#DC2626',
                paddingVertical: 14,
                borderRadius: 999,
                alignItems: 'center',
              })}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
