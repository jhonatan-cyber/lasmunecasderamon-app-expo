import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BaucherFoto } from '@/components/shared/BaucherFoto';
import { useAccentColor } from '@/hooks/useAccentColor';
import { apiClientSafe } from '@/api/client';
import {
  getMirror,
  MIRROR_KEYS,
  MIRROR_MAX_AGE_MS,
  OfflineCacheMissError,
} from '@/services/mirror';
import { Colors } from '@/constants/theme';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';
import { formatCurrency } from '@/utils/format';
import { parseDateSafe } from '@/utils/timeUtils';
import type { Pedido } from '@/hooks/useMisPedidos';
import { DetailSheet } from '@/components/ui/DetailSheet';

type PedidoDetalleLinea = {
  id_detalle_pedido?: string | number;
  producto_nombre?: string;
  presentacion_nombre?: string | null;
  acompanamiento_nombre?: string | null;
  anfitrionas_asignadas_nombres?: string | null;
  cantidad: number;
  precio: number;
  subtotal_detalle?: number;
  sub_total?: number;
  propina?: number;
  total?: number;
  subtotal?: number;
  metodo_pago?: string | null;
  baucher_foto?: string | null;
  fecha_crea?: string;
  codigo?: string;
  cliente?: string | null;
  cliente_nombre?: string | null;
  garzon?: string | null;
  mesero_nombre?: string | null;
  anfitriona?: string | null;
  nicks?: string | null;
};

type PedidoDetailModalProps = {
  visible: boolean;
  pedido: Pedido | null;
  onClose: () => void;
};

const STATUS_LABELS: Record<number, string> = {
  0: 'Aprobado',
  1: 'Pendiente',
  2: 'Rechazado',
  3: 'Cancelado',
};

export function PedidoDetailModal({
  visible,
  pedido,
  onClose,
}: PedidoDetailModalProps) {
  const {
    accentOnSurface,
    borderColor,
    textPrimary,
    textSecondary,
    surfaceMuted,
    isDark,
  } = useAccentColor();
  const [detail, setDetail] = useState<PedidoDetalleLinea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !pedido?.id_pedido) return;
    const controller = new AbortController();

    void (async () => {
      setDetail([]);
      setError('');
      setLoading(true);
      try {
        const result = await getMirror().readThroughDetailed<any>(
          MIRROR_KEYS.orderDetail(pedido.id_pedido),
          async () => {
            const res = await apiClientSafe(
              `/orders/detail?id=${encodeURIComponent(pedido.id_pedido)}`,
              { signal: controller.signal },
            );
            if (!res.success) {
              throw new Error(res.message || 'No se pudo cargar el pedido');
            }
            return res;
          },
          { maxAgeMs: MIRROR_MAX_AGE_MS.operativo },
        );
        if (controller.signal.aborted) return;
        const payload = result.data;
        const rows = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        setDetail(rows as PedidoDetalleLinea[]);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof OfflineCacheMissError
            ? 'Sin conexión y sin detalle guardado de este pedido.'
            : err?.message || 'No se pudo cargar el detalle del pedido.',
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [visible, pedido?.id_pedido]);

  const head = detail[0];
  const statusColor =
    pedido?.estado === 0
      ? Colors[isDark ? 'dark' : 'light'].success
      : pedido?.estado === 1
        ? Colors[isDark ? 'dark' : 'light'].warning
        : pedido?.estado === 2
          ? Colors[isDark ? 'dark' : 'light'].error
          : textSecondary;
  const fechaRaw = head?.fecha_crea || pedido?.fecha_crea;
  const fecha = fechaRaw
    ? parseDateSafe(fechaRaw).toLocaleString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Sin fecha';
  const cliente = head?.cliente || head?.cliente_nombre || pedido?.cliente_nombre;
  const garzon =
    head?.garzon || head?.mesero_nombre || pedido?.mesero_nombre;
  const anfitrionas =
    head?.anfitrionas_asignadas_nombres ||
    head?.anfitriona ||
    head?.nicks ||
    pedido?.nicks;
  const subtotal =
    Number(head?.subtotal ?? head?.sub_total ?? pedido?.subtotal ?? 0) || 0;
  const propina = Number(head?.propina ?? pedido?.propina ?? 0) || 0;
  const total = Number(pedido?.total ?? head?.total ?? subtotal + propina) || 0;
  const lineTotal = (line: PedidoDetalleLinea) =>
    Number(
      line.subtotal_detalle ??
        line.sub_total ??
        Number(line.precio || 0) * Number(line.cantidad || 0),
    );

  return (
    <DetailSheet
      visible={visible}
      onClose={onClose}
      title={`Pedido ${pedido?.codigo || ''}`}
      status={{
        label: STATUS_LABELS[pedido?.estado ?? -1] || 'Desconocido',
        color: statusColor,
      }}
      loading={loading}
      loadingLabel="Cargando detalle…"
      error={error || null}
      height="88%"
      footerActions={[{ label: 'Cerrar', onPress: onClose }]}
      accessibilityLabel="Detalle del pedido"
    >
              <View
                style={[
                  styles.infoCard,
                  { backgroundColor: surfaceMuted, borderColor },
                ]}
              >
                <InfoRow label="Fecha" value={fecha} color={textSecondary} valueColor={textPrimary} />
                <InfoRow
                  label="Cliente"
                  value={cliente || 'Sin cliente'}
                  color={textSecondary}
                  valueColor={textPrimary}
                />
                <InfoRow
                  label="Garzón"
                  value={garzon || 'Sin registrar'}
                  color={textSecondary}
                  valueColor={textPrimary}
                />
                {!!anfitrionas && (
                  <InfoRow
                    label="Anfitriona(s)"
                    value={anfitrionas}
                    color={textSecondary}
                    valueColor={textPrimary}
                  />
                )}
                <InfoRow
                  label="Pago"
                  value={String(head?.metodo_pago || pedido?.metodo_pago || 'No registrado')}
                  color={textSecondary}
                  valueColor={textPrimary}
                />
              </View>

              <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                Productos
              </Text>
              {detail.length === 0 ? (
                <Text style={[styles.muted, { color: textSecondary }]}>
                  No hay líneas disponibles.
                </Text>
              ) : (
                detail.map((line, index) => (
                  <View
                    key={String(line.id_detalle_pedido ?? index)}
                    style={[styles.line, { borderBottomColor: borderColor }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lineName, { color: textPrimary }]}>
                        {line.producto_nombre || 'Producto'}
                      </Text>
                      {!!line.presentacion_nombre && (
                        <Text style={[styles.lineMeta, { color: textSecondary }]}>
                          {line.presentacion_nombre}
                        </Text>
                      )}
                      {!!line.acompanamiento_nombre && (
                        <Text style={[styles.lineMeta, { color: textSecondary }]}>
                          Acompañamiento: {line.acompanamiento_nombre}
                        </Text>
                      )}
                      {!!line.anfitrionas_asignadas_nombres && (
                        <Text style={[styles.lineMeta, { color: textSecondary }]}>
                          Anfitriona: {line.anfitrionas_asignadas_nombres}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.lineQty, { color: textSecondary }]}>
                        {line.cantidad} × {formatCurrency(line.precio)}
                      </Text>
                      <Text style={[styles.lineTotal, { color: textPrimary }]}>
                        {formatCurrency(lineTotal(line))}
                      </Text>
                    </View>
                  </View>
                ))
              )}

              <View
                style={[
                  styles.totals,
                  { backgroundColor: surfaceMuted, borderColor },
                ]}
              >
                <TotalRow
                  label="Subtotal"
                  value={formatCurrency(subtotal)}
                  color={textSecondary}
                  valueColor={textPrimary}
                />
                {propina > 0 && (
                  <TotalRow
                    label="Propina"
                    value={formatCurrency(propina)}
                    color={textSecondary}
                    valueColor={textPrimary}
                  />
                )}
                <View style={[styles.divider, { backgroundColor: borderColor }]} />
                <TotalRow
                  label="TOTAL"
                  value={formatCurrency(total)}
                  color={textPrimary}
                  valueColor={accentOnSurface}
                  strong
                />
              </View>

              {!!(head?.baucher_foto || pedido?.baucher_foto) && (
                <View style={{ marginTop: 14 }}>
                  <BaucherFoto
                    endpoint={`/orders/${pedido?.id_pedido}/baucher`}
                    descripcion={`Pedido ${pedido?.codigo}`}
                  />
                </View>
              )}
    </DetailSheet>
  );
}

function InfoRow({
  label,
  value,
  color,
  valueColor,
}: {
  label: string;
  value: string;
  color: string;
  valueColor: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function TotalRow({
  label,
  value,
  color,
  valueColor,
  strong = false,
}: {
  label: string;
  value: string;
  color: string;
  valueColor: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.totalRow}>
      <Text
        style={[
          styles.totalLabel,
          { color, fontFamily: strong ? FontFamily.black : FontFamily.semibold },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          strong ? styles.totalStrong : styles.totalValue,
          { color: valueColor },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  title: { fontSize: 22, fontFamily: FontFamily.black },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { fontSize: 13, fontFamily: FontFamily.medium, textAlign: 'center' },
  error: { fontSize: 14, fontFamily: FontFamily.semibold, textAlign: 'center' },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 7,
    marginBottom: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel: { width: 88, fontSize: 11, fontFamily: FontFamily.bold },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: FontFamily.semibold,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FontFamily.black,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  line: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lineName: { fontSize: 14, fontFamily: FontFamily.extrabold },
  lineMeta: { fontSize: 11, fontFamily: FontFamily.medium, marginTop: 2 },
  lineQty: { fontSize: 11, fontFamily: FontFamily.medium },
  lineTotal: { fontSize: 14, fontFamily: FontFamily.extrabold },
  totals: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 7,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 14, fontFamily: FontFamily.extrabold },
  totalStrong: { fontSize: 20, fontFamily: FontFamily.black },
  divider: { height: 1, marginVertical: 3 },
  closeBtn: {
    minHeight: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  closeText: { fontSize: 16, fontFamily: FontFamily.extrabold },
});
