import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BorderRadius } from '@/constants/spacing';
import Ionicons from '@expo/vector-icons/Ionicons';

interface UnidadBebida {
  presentacion_id?: string;
  producto_nombre?: string;
  presentacion_nombre?: string;
  tipo_entrega?: string;
}

interface SolicitudCover {
  id: string;
  cliente_nombre?: string;
  solicitado_por_nick?: string;
  unidades?: unknown;
}

interface SolicitudCardProps {
  solicitud: SolicitudCover;
  nombresBebida: Record<string, string>;
  textPrimary: string;
  textSecondary: string;
  successColor: string;
  dangerColor: string;
  borderColor: string;
  onAprobar: (id: string) => void;
  onRechazar: (id: string) => void;
}

/**
 * Tarjeta de solicitud de covers del barman para autorizar o rechazar.
 * Extraído de CoversScreen.tsx para reducir el tamaño del screen.
 */
export const SolicitudCard: React.FC<SolicitudCardProps> = ({
  solicitud,
  nombresBebida,
  textPrimary,
  textSecondary,
  successColor,
  dangerColor,
  borderColor,
  onAprobar,
  onRechazar,
}) => {
  const unidades: UnidadBebida[] = Array.isArray(solicitud.unidades)
    ? solicitud.unidades
    : (() => {
        try {
          return JSON.parse(solicitud.unidades as string || '[]');
        } catch {
          return [];
        }
      })();

  return (
    <View
      key={solicitud.id}
      style={{ borderBottomWidth: 1, borderColor, paddingVertical: 12 }}
    >
      <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }}>
        {solicitud.cliente_nombre || 'Cliente sin nombre'}
      </Text>
      <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
        Solicitó: {solicitud.solicitado_por_nick || 'Barman'} ·{unidades.length}{' '}
        {unidades.length === 1 ? 'bebida' : 'bebidas'}
      </Text>
      {unidades.map((unidad: UnidadBebida, index: number) => (
        <Text
          key={`${unidad.presentacion_id}-${index}`}
          style={{ color: textPrimary, fontSize: 12, marginTop: 8 }}
        >
          •{' '}
          {unidad.producto_nombre
            ? `${unidad.producto_nombre}${unidad.presentacion_nombre ? ` · ${unidad.presentacion_nombre}` : ''}`
            : nombresBebida[unidad.presentacion_id as string] || 'Producto'}
          {unidad.tipo_entrega === 'botella' ? ' · Botella' : ' · Corte'}
        </Text>
      ))}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Pressable
          onPress={() => onAprobar(solicitud.id)}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: BorderRadius.full,
              backgroundColor: successColor,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={16} color="#FFF" />
          <Text
            style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}
          >
            APROBAR
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onRechazar(solicitud.id)}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: BorderRadius.full,
              backgroundColor: dangerColor,
            },
          ]}
        >
          <Ionicons name="close-circle" size={16} color="#FFF" />
          <Text
            style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}
          >
            RECHAZAR
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
