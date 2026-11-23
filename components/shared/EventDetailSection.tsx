import { useAuthStore } from '@/store/authStore';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  textPrimary: string;
  textSecondary: string;
  style?: StyleProp<ViewStyle>;
}

function DetailRow({ label, value, textPrimary, textSecondary, style }: DetailRowProps) {
  return (
    <View style={[styles.detailRow, style]}>
      <Text style={[styles.detailLabel, { color: textSecondary }]}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={[styles.detailValue, { color: textPrimary }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

interface EventDetailSectionProps {
  eventDetail: any;
  accentColor: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  formatAmount: (value: any) => string;
}

export function EventDetailSection({
  eventDetail,
  accentColor,
  borderColor,
  textPrimary,
  textSecondary,
  formatAmount,
}: EventDetailSectionProps) {
  const user = useAuthStore((state) => state.user);
  const dangerColor = accentColor;
  const successColor = accentColor;

  if (!eventDetail) return null;

  return (
    <>
      <View style={[styles.divider, { backgroundColor: borderColor }]} />

      {eventDetail.tipo === 'asistencia' && (
        <>
          <DetailRow label="Sueldo" value={`$${formatAmount(eventDetail.sueldo)}`} textPrimary={textPrimary} textSecondary={textSecondary} />
          <DetailRow label="Aporte" value={`-$${formatAmount(eventDetail.aporte)}`} textPrimary={dangerColor} textSecondary={textSecondary} />
          {Number(eventDetail.descuento_total) > 0 && (
            <DetailRow
              label={`Desc. habitación (${eventDetail.semanas_con_descuento} sem.)`}
              value={`-$${formatAmount(eventDetail.descuento_total)}`}
              textPrimary={dangerColor}
              textSecondary={textSecondary}
            />
          )}
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <DetailRow label="Neto por asistencia" value={`$${formatAmount(eventDetail.neto)}`} textPrimary={successColor} textSecondary={textSecondary} />
        </>
      )}

      {eventDetail.tipo === 'anticipo' && (
        <>
          <DetailRow label="Solicitado por" value={eventDetail.solicitante_nick || eventDetail.solicitante_nombre} textPrimary={textPrimary} textSecondary={textSecondary} />
          <DetailRow label="Monto" value={`$${formatAmount(eventDetail.monto)}`} textPrimary={dangerColor} textSecondary={textSecondary} />
          {eventDetail.observacion && (
            <DetailRow
              label="Motivo"
              value={
                <Text style={[styles.detailValue, { color: textPrimary, flex: 1, textAlign: 'right', fontSize: 13 }]}>
                  {eventDetail.observacion}
                </Text>
              }
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          )}
          {eventDetail.historial?.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              <View style={{ width: '100%' }}>
                <Text style={[styles.detailLabel, { color: textSecondary, marginBottom: 16 }]}>Historial</Text>
                {eventDetail.historial.map((h: any, i: number) => (
                  <View key={i} style={styles.timelineRow}>
                    <View style={styles.timelineLine}>
                      <View style={[styles.timelineDot, { backgroundColor: accentColor }]} />
                      {i < eventDetail.historial.length - 1 && (
                        <View style={[styles.timelineConnector, { backgroundColor: borderColor }]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineAction, { color: textPrimary }]}>
                        {getAccionLabel(h.accion)}
                      </Text>
                      <Text style={[styles.timelineMeta, { color: textSecondary }]}>
                        {h.usuario_accion_nick ? `por ${h.usuario_accion_nick} — ` : ''}
                        {new Date(h.fecha_crea).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}

      {eventDetail.garzon_nombre && (
        <DetailRow label="Realizó el pedido" value={eventDetail.garzon_nick || eventDetail.garzon_nombre} textPrimary={textPrimary} textSecondary={textSecondary} />
      )}

      {eventDetail.cajero_nombre && (
        <DetailRow label="Procesó la venta" value={eventDetail.cajero_nick || eventDetail.cajero_nombre} textPrimary={textPrimary} textSecondary={textSecondary} />
      )}

      {eventDetail.habitacion_nombre && (
        <DetailRow label="Habitación" value={eventDetail.habitacion_nombre} textPrimary={textPrimary} textSecondary={textSecondary} />
      )}

      {eventDetail.tiempo && (
        <DetailRow label="Tiempo" value={`${eventDetail.tiempo} min`} textPrimary={textPrimary} textSecondary={textSecondary} />
      )}

      {eventDetail.cliente_nombre && eventDetail.cliente_nombre !== 'Sin cliente' && (
        <DetailRow label="Cliente" value={eventDetail.cliente_nombre} textPrimary={textPrimary} textSecondary={textSecondary} />
      )}

      {eventDetail.anfitrionas?.length > 0 && (
        <DetailRow
          label="Anfitrionas"
          value={
            <Text style={[styles.detailValue, { color: textPrimary, flex: 1, textAlign: 'right' }]}>
              {eventDetail.anfitrionas.map((a: any) => a.nick || a.nombre).join(', ')}
            </Text>
          }
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        />
      )}

      {user?.role?.toLowerCase() !== 'anfitriona' && eventDetail.propinas_detalle?.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <DetailRow
            label="Propina total"
            value={`$${formatAmount(eventDetail.propinas_detalle.reduce((s: number, p: any) => s + Number(p.monto), 0))}`}
            textPrimary={successColor}
            textSecondary={textSecondary}
          />
          <DetailRow
            label="Dividida entre"
            value={`${eventDetail.propinas_detalle.length} (${eventDetail.propinas_detalle.map((p: any) => p.nick || p.nombre).join(', ')})`}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
        </>
      )}

      {user?.role?.toLowerCase() === 'anfitriona' && eventDetail.anfitrionas?.length > 0 && (
        <View style={{ width: '100%', marginTop: 4 }}>
          <Text style={[styles.detailLabel, { color: textSecondary, marginBottom: 8 }]}>Comisión por anfitriona</Text>
          {eventDetail.anfitrionas.map((a: any, i: number) => (
            <View key={i} style={[styles.detailRow, { marginBottom: 6 }]}>
              <Text style={[styles.detailLabel, { color: textPrimary, flex: 1 }]}>{a.nick || a.nombre}</Text>
              <Text style={[styles.detailValue, { color: successColor }]}>${formatAmount(a.comision || 0)}</Text>
            </View>
          ))}
        </View>
      )}

      {eventDetail.detalles?.length > 0 && (
        <View style={{ width: '100%', marginTop: 4 }}>
          <Text style={[styles.detailLabel, { color: textSecondary, marginBottom: 8 }]}>Productos</Text>
          {eventDetail.detalles.map((d: any, i: number) => (
            <View key={i} style={[styles.detailRow, { marginBottom: 6 }]}>
              <Text style={[styles.detailLabel, { color: textPrimary, flex: 1 }]}>{d.cantidad}x {d.producto_nombre}</Text>
              <Text style={[styles.detailValue, { color: textSecondary }]}>${formatAmount(d.subtotal)}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const getAccionLabel = (accion: string): string => {
  const labels: Record<string, string> = {
    solicitud: 'Solicitado',
    aprobado: 'Aprobado por admin',
    rechazado: 'Rechazado',
    entregado: 'Entregado',
    anulado: 'Anulado',
    pendiente: 'Pendiente',
    actualizado: 'Actualizado',
  };
  return labels[accion] || accion;
};

const styles = StyleSheet.create({
  detailRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semibold,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 25,
    opacity: 0.5,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  timelineConnector: {
    width: 1,
    flex: 1,
    minHeight: 28,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineAction: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    marginBottom: 2,
  },
  timelineMeta: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
});
