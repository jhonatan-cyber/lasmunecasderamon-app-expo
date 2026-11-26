import React from 'react';
import { Text, View } from 'react-native';
import { IconButton } from '@/components/ui/IconButton';

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
        <IconButton
          icon="checkmark-circle-outline"
          accessibilityLabel={`Aprobar solicitud de covers de ${solicitud.cliente_nombre || 'cliente sin nombre'}`}
          accessibilityHint="Autoriza la entrega de las bebidas solicitadas."
          tooltip="Aprobar solicitud"
          onPress={() => onAprobar(solicitud.id)}
          color="#FFFFFF"
          backgroundColor={successColor}
        />
        <IconButton
          icon="close-circle-outline"
          accessibilityLabel={`Rechazar solicitud de covers de ${solicitud.cliente_nombre || 'cliente sin nombre'}`}
          accessibilityHint="Rechaza la entrega de las bebidas solicitadas."
          tooltip="Rechazar solicitud"
          onPress={() => onRechazar(solicitud.id)}
          color="#FFFFFF"
          backgroundColor={dangerColor}
        />
      </View>
    </View>
  );
};
