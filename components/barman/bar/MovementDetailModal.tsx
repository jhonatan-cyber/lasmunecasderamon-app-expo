import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BASE_URL } from '@/api/client';
import { useAccentColor } from '@/hooks/useAccentColor';
import type { BarMovement, BarTransfer } from '@/hooks/useBarScreen';
import { parseOpcionesVenta } from '@/hooks/utils/saleChoice';
import { formatCurrency } from '@/utils/format';

interface MovementDetailModalProps {
  visible: boolean;
  movement: BarMovement | null;
  transfer?: BarTransfer;
  onClose: () => void;
}

export function MovementDetailModal({ visible, movement, transfer, onClose }: MovementDetailModalProps) {
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const fecha = movement?.fecha_crea ? new Date(movement.fecha_crea) : null;
  const fechaValida = fecha && !Number.isNaN(fecha.getTime());
  const opciones = parseOpcionesVenta(transfer?.opciones_venta ?? movement?.opciones_venta);
  const estado = transfer?.estado ?? movement?.estado;
  const imageName = movement?.producto_foto;

  return (
    <Modal visible={visible && movement !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar detalle" />
        {movement && (
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.header}>
              <View style={[styles.iconWrap, { backgroundColor: `${accentColor}20` }]}>
                <Ionicons name={movement.tipo === 'traspaso' ? 'swap-horizontal' : 'wine-outline'} size={22} color={accentColor} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.eyebrow, { color: textSecondary }]}>DETALLE DEL MOVIMIENTO</Text>
                <Text style={[styles.title, { color: textPrimary }]} numberOfLines={2}>{movement.producto_nombre || 'Producto'}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar modal">
                <Ionicons name="close-circle" size={26} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.details}>
              <View style={styles.product}>
                {imageName ? (
                  <Image source={{ uri: `${BASE_URL}/api/images/products/${encodeURIComponent(imageName)}` }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}><Ionicons name="wine-outline" size={30} color={textSecondary} /></View>
                )}
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: textPrimary }]}>{movement.producto_nombre || '—'}</Text>
                  <Text style={[styles.productMeta, { color: textSecondary }]}>{movement.presentacion_nombre || 'Presentación —'}</Text>
                  {!!movement.categoria_nombre && <Text style={[styles.productMeta, { color: textSecondary }]}>Categoría: {movement.categoria_nombre}</Text>}
                  {!!movement.codigo_barras && <Text style={[styles.productMeta, { color: textSecondary }]}>Código: {movement.codigo_barras}</Text>}
                </View>
              </View>

              <View style={styles.grid}>
                <Info label="Tipo" value={movement.tipo} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                <Info label="Estado" value={estado || 'Completado'} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                <Info label="Cantidad" value={`${movement.cantidad} unidades`} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                {!!movement.ml && <Info label="Volumen" value={`${movement.ml} ml`} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />}
                <Info label="Precio unitario" value={movement.precio_venta !== null ? formatCurrency(movement.precio_venta) : '—'} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                <Info label="Comisión" value={movement.comision !== null ? formatCurrency(movement.comision) : '—'} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                <Info label="Registrado por" value={movement.usuario_nombre || movement.usuario_nick || '—'} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                {movement.referencia && <Info label="Referencia" value={movement.referencia} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />}
                {transfer?.aceptado_nombre && <Info label="Recibido / aprobado por" value={transfer.aceptado_nombre} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />}
                {transfer?.fecha_aceptacion && <Info label="Fecha de aceptación" value={new Date(transfer.fecha_aceptacion).toLocaleString('es-BO')} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />}
                <Info label="Fecha" value={fechaValida ? fecha!.toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—'} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />
              </View>

              {opciones.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: textSecondary }]}>PRECIOS CONFIGURADOS EN EL TRASPASO</Text>
                  <View style={styles.grid}>
                    {opciones.map((opcion, index) => <Info key={`${opcion.tipo}-${index}`} label={opcion.tipo === 'botella' ? 'Botella' : 'Shot cliente'} value={`${formatCurrency(opcion.precio)} · comisión ${formatCurrency(opcion.comision)}`} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />)}
                    {opciones.filter((opcion) => opcion.tipo === 'shot' && Number(opcion.precio_anfitriona ?? 0) > 0 && Number(opcion.precio_anfitriona) !== Number(opcion.precio)).map((opcion) => <Info key="shot-anfitriona" label="Shot anfitriona" value={`${formatCurrency(Number(opcion.precio_anfitriona))} · comisión ${formatCurrency(opcion.comision)}`} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />)}
                  </View>
                  {(transfer?.ml_shot ?? movement.ml_shot ?? 0) > 0 && (
                    <View style={[styles.grid, styles.volumeGrid]}>
                      <Info label="Ml shot cliente" value={`${transfer?.ml_shot ?? movement.ml_shot} ml`} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                      <Info label="Ml shot anfitriona" value={`${transfer?.ml_shot_anfitriona ?? movement.ml_shot_anfitriona ?? transfer?.ml_shot ?? movement.ml_shot} ml`} accentColor={accentColor} textPrimary={textPrimary} textSecondary={textSecondary} />
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, { backgroundColor: accentColor, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={styles.closeText}>Cerrar detalle</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

function Info({ label, value, accentColor, textPrimary, textSecondary }: { label: string; value: string; accentColor: string; textPrimary: string; textSecondary: string }) {
  return (
    <View style={[styles.infoTile, { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}08` }]}>
      <Text style={[styles.infoLabel, { color: textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.65)' },
  modalCard: { width: '100%', maxWidth: 540, maxHeight: '90%', borderRadius: 22, borderWidth: 1, padding: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingBottom: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(148,163,184,0.25)' },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  details: { gap: 15, paddingVertical: 15 },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: 74, height: 74, borderRadius: 14 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(127,127,127,0.12)' },
  productInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 16, fontWeight: '900' },
  productMeta: { fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { gap: 9 },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  volumeGrid: { marginTop: 8 },
  infoTile: { width: '48%', minHeight: 58, padding: 9, borderWidth: 1, borderRadius: 13, justifyContent: 'space-between', gap: 5 },
  infoLabel: { fontSize: 9, fontWeight: '700' },
  infoValue: { fontSize: 12, fontWeight: '900' },
  closeButton: { borderRadius: 9999, alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  closeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});
