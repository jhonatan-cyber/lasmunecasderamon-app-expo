import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from "@/hooks/useAccentColor";
import { formatCurrency } from "@/utils/format";
import type { BarTransfer } from "@/hooks/useBarScreen";
import {
  etiquetaOpcionVenta,
  resolverVentaProducto,
} from "@/hooks/utils/saleChoice";
import { TransferActions } from "./TransferCard";

interface TransferDetailModalProps {
  visible: boolean;
  item: BarTransfer | null;
  resolving: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export function TransferDetailModal({
  visible,
  item,
  resolving,
  onClose,
  onAccept,
  onReject,
}: TransferDetailModalProps) {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor } =
    useAccentColor();
  const fecha = item?.fecha_crea ? new Date(item.fecha_crea) : null;
  const fechaValida = fecha && !Number.isNaN(fecha.getTime());
  const opcionesVenta = resolverVentaProducto(item ?? {}).opciones;
  // Sin corto en la configuración del traspaso no hay volumen por corto que mostrar:
  // el ml del producto (o el global) no describe nada de lo que se va a servir.
  const muestraVolumenCorto = opcionesVenta.some((option) => option.esShot);
  const mlShotCliente = Number(item?.ml_shot || 0);
  const mlShotAnfitriona = Number(item?.ml_shot_anfitriona || mlShotCliente);

  return (
    <Modal
      visible={visible && item !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Cerrar detalle"
        />
        {item && (
          <View
            style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.eyebrow, { color: textSecondary }]}>
                  DETALLE DEL TRASPASO
                </Text>
                <Text style={[styles.title, { color: textPrimary }]}>
                  {item.producto_nombre}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityLabel="Cerrar modal"
              >
                <Ionicons name="close-circle" size={26} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.details}
            >
              <View
                style={[
                  styles.quantityCard,
                  {
                    backgroundColor: `${accentColor}12`,
                    borderColor: `${accentColor}40`,
                  },
                ]}
              >
                <Text style={[styles.quantityLabel, { color: textSecondary }]}>
                  CANTIDAD ENVIADA
                </Text>
                <Text style={[styles.quantityValue, { color: accentColor }]}>
                  {item.cantidad} unidades
                </Text>
                <Text style={[styles.presentation, { color: textPrimary }]}>
                  {item.presentacion_nombre}
                </Text>
              </View>

              <View style={styles.detailRowGroup}>
                {item.categoria_nombre && (
                  <View style={styles.detailRowHalf}>
                    <Ionicons name="pricetag-outline" size={18} color={textSecondary} />
                    <View style={styles.detailText}>
                      <Text style={[styles.detailLabel, { color: textSecondary }]}>Categoría</Text>
                      <Text style={[styles.detailValue, { color: textPrimary }]}>{item.categoria_nombre}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.detailRowHalf}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={textSecondary} />
                  <View style={styles.detailText}>
                    <Text style={[styles.detailLabel, { color: textSecondary }]}>Estado</Text>
                    <Text style={[styles.detailValue, { color: textPrimary }]}>
                      {item.estado ? item.estado.charAt(0).toUpperCase() + item.estado.slice(1) : "—"}
                    </Text>
                  </View>
                </View>
              </View>
              <DetailRow
                icon="person-outline"
                label="Enviado por"
                value={item.usuario_nombre || "—"}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
              <DetailRow
                icon="calendar-outline"
                label="Fecha del traspaso"
                value={
                  fechaValida
                    ? fecha!.toLocaleString("es-BO", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"
                }
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
              {item.aceptado_nombre && (
                <DetailRow
                  icon="checkmark-circle-outline"
                  label="Aceptado por"
                  value={item.aceptado_nombre}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                />
              )}
              {item.fecha_aceptacion && (
                <DetailRow
                  icon="time-outline"
                  label="Fecha de aceptación"
                  value={
                    !Number.isNaN(new Date(item.fecha_aceptacion).getTime())
                      ? new Date(item.fecha_aceptacion).toLocaleString("es-BO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"
                  }
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                />
              )}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: textSecondary }]}>
                  PRECIOS DE VENTA
                </Text>
                {opcionesVenta.length > 0 ? (
                  <View style={styles.infoGrid}>
                    {opcionesVenta.map((option) => (
                      <InfoTile
                        key={option.value}
                        icon="beer-outline"
                        label={etiquetaOpcionVenta(option, opcionesVenta)}
                        value={
                          option.comision > 0
                            ? `${formatCurrency(option.precio)} · comisión ${formatCurrency(option.comision)}`
                            : formatCurrency(option.precio)
                        }
                        accentColor={accentColor}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.infoGrid}>
                    <InfoTile
                      icon="pricetag-outline"
                      label="Precio de venta"
                      value={formatCurrency(item.precio_venta || 0)}
                      accentColor={accentColor}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                    />
                    {Number(item.comision) > 0 && (
                      <InfoTile
                        icon="cash-outline"
                        label="Comisión"
                        value={formatCurrency(item.comision)}
                        accentColor={accentColor}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                      />
                    )}
                  </View>
                )}
              </View>

              {muestraVolumenCorto && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: textSecondary }]}>
                    VOLUMEN POR CORTO
                  </Text>
                  <View style={styles.infoGrid}>
                    <InfoTile
                      icon="flask-outline"
                      label="Corto cliente"
                      value={
                        mlShotCliente > 0
                          ? `${mlShotCliente} ml`
                          : "No configurado"
                      }
                      accentColor={accentColor}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                    />
                    <InfoTile
                      icon="flask-outline"
                      label="Corto anfitriona"
                      value={
                        mlShotAnfitriona > 0
                          ? `${mlShotAnfitriona} ml`
                          : "No configurado"
                      }
                      accentColor={accentColor}
                      textPrimary={textPrimary}
                      textSecondary={textSecondary}
                    />
                  </View>
                </View>
              )}

              <View
                style={[
                  styles.notice,
                  { borderColor: "#F59E0B50", backgroundColor: "#F59E0B12" },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#F59E0B"
                />
                <Text style={styles.noticeText}>
                  Confirma que recibiste el producto antes de aprobar el
                  traspaso.
                </Text>
              </View>
            </ScrollView>

            <TransferActions
              resolving={resolving}
              onAccept={onAccept}
              onReject={onReject}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
  textPrimary,
  textSecondary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={textSecondary} />
      <View style={styles.detailText}>
        <Text style={[styles.detailLabel, { color: textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.detailValue, { color: textPrimary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function InfoTile({
  icon,
  label,
  value,
  accentColor,
  textPrimary,
  textSecondary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <View
      style={[
        styles.infoTile,
        {
          borderColor: `${accentColor}30`,
          backgroundColor: `${accentColor}08`,
        },
      ]}
    >
      <View style={styles.infoTileLabel}>
        <Ionicons name={icon} size={15} color={accentColor} />
        <Text
          style={[styles.infoTileTitle, { color: textSecondary }]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[styles.infoTileValue, { color: textPrimary }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "88%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.25)",
  },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  title: { fontSize: 19, fontWeight: "900", marginTop: 3 },
  details: { gap: 16, paddingVertical: 16 },
  sectionTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  section: { gap: 9 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoTile: {
    width: "48%",
    minHeight: 68,
    padding: 10,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: "space-between",
    gap: 8,
  },
  infoTileLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoTileTitle: { flex: 1, fontSize: 10, lineHeight: 13, fontWeight: "700" },
  infoTileValue: { fontSize: 15, fontWeight: "900" },
  quantityCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  quantityLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  quantityValue: { fontSize: 26, fontWeight: "900", marginTop: 4 },
  presentation: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailRowGroup: { flexDirection: "row", gap: 12 },
  detailRowHalf: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  detailText: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: "700" },
  detailValue: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  noticeText: { flex: 1, color: "#F59E0B", fontSize: 12, fontWeight: "700" },
});
