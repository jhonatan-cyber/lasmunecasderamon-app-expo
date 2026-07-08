import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface Props {
    item: any;
    index: number;
    isDark: boolean;
    textPrimary: string;
    textSecondary: string;
}

const PAYMENT_ICONS: Record<string, string> = {
    efectivo: 'cash-outline',
    tarjeta: 'card-outline',
    transferencia: 'swap-horizontal-outline',
    prepago: 'wallet-outline',
    mixto: 'layers-outline',
};

export function HistoryItemCard({ item, index, isDark, textPrimary, textSecondary }: Props) {
    const isCarga = item.category === 'CARGA';
    const isServicio = item.category === 'SERVICIO';
    const isConsumo = item.category === 'CONSUMO';
    const iconColor = isCarga ? '#10B981' : isServicio ? '#3B82F6' : '#F59E0B';
    const iconBg = isCarga ? 'rgba(16,185,129,0.12)' : isServicio ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)';
    const iconName = isCarga ? 'arrow-up-circle' : isServicio ? 'bed' : 'cart';
    const categoryLabel = isCarga ? 'Carga de Saldo' : isServicio ? 'Servicio' : 'Consumo';
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

    return (
        <View key={`${item.id}-${index}`} style={{
            borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12, overflow: 'hidden',
            backgroundColor: cardBg, borderColor: cardBorder,
        }}>
            {}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: iconBg }}>
                    <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={22} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#FFFFFF' : '#111827', letterSpacing: -0.2 }}>
                                {categoryLabel}
                            </Text>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary, marginTop: 1 }}>
                                {new Date(item.fecha_crea).toLocaleString('es-CL', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </Text>
                        </View>
                        <View style={{
                            backgroundColor: isCarga ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
                        }}>
                            <Text style={{ fontSize: 15, fontWeight: '900', color: isCarga ? '#10B981' : '#EF4444' }}>
                                {isCarga ? '+' : '-'}${(Number(item.monto || 0)).toLocaleString('es-CL')}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {}
            {isServicio && item.detalle && (
                <View style={{
                    marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1,
                    backgroundColor: isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)',
                    borderColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
                }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                        {item.detalle.habitacion && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={miniBoxBlue}>
                                    <Ionicons name="bed-outline" size={14} color="#3B82F6" />
                                </View>
                                <View>
                                    <DetailLabel text="Habitación" color="#3B82F6" />
                                    <DetailVal value={item.detalle.habitacion} color={textPrimary} />
                                </View>
                            </View>
                        )}
                        {item.detalle.tiempo && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={miniBoxBlue}>
                                    <Ionicons name="timer-outline" size={14} color="#3B82F6" />
                                </View>
                                <View>
                                    <DetailLabel text="Duración" color="#3B82F6" />
                                    <DetailVal value={`${item.detalle.tiempo} min`} color={textPrimary} />
                                </View>
                            </View>
                        )}
                    </View>
                    {Array.isArray(item.detalle.anfitrionas) && item.detalle.anfitrionas.length > 0 && (
                        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View style={miniBoxBlue}>
                                <Ionicons name="people-outline" size={14} color="#3B82F6" />
                            </View>
                            {item.detalle.anfitrionas.map((name: string, i: number) => (
                                <View key={i} style={pillBlue}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#3B82F6' }}>{name}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {}
            {isConsumo && item.detalle && (
                <View style={{ marginTop: 12 }}>
                    {Array.isArray(item.detalle.productos) && item.detalle.productos.length > 0 && (
                        <View style={{
                            marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1,
                            backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
                            borderColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                                <View style={miniBoxOrange}>
                                    <Ionicons name="fast-food-outline" size={12} color="#F59E0B" />
                                </View>
                                <DetailLabel text="Productos" color="#F59E0B" />
                            </View>
                            {item.detalle.productos.map((p: any, idx: number) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3, gap: 6 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' }} />
                                    <Text style={{ fontSize: 13, color: textPrimary, fontWeight: '700' }}>
                                        {p.cantidad || 1}x {p.nombre || 'Producto'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                    {Array.isArray(item.detalle.anfitrionas) && item.detalle.anfitrionas.length > 0 && (
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View style={miniBoxOrange}>
                                <Ionicons name="people-outline" size={14} color="#F59E0B" />
                            </View>
                            {item.detalle.anfitrionas.map((name: string, i: number) => (
                                <View key={i} style={pillOrange}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#F59E0B' }}>{name}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                }}>
                    <Ionicons
                        name={(PAYMENT_ICONS[item.metodo_pago] || 'wallet-outline') as keyof typeof Ionicons.glyphMap}
                        size={12}
                        color={textSecondary}
                    />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                        {item.metodo_pago || 'pago'}
                    </Text>
                </View>
            </View>
        </View>
    );
}

function DetailLabel({ text, color }: { text: string; color: string }) {
    return (
        <Text style={{ fontSize: 8, fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {text}
        </Text>
    );
}

function DetailVal({ value, color }: { value: string; color: string }) {
    return <Text style={{ fontSize: 13, fontWeight: '900', color }}>{value}</Text>;
}

const miniBoxBlue = {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center' as const, alignItems: 'center' as const,
};

const miniBoxOrange = {
    width: 22, height: 22, borderRadius: 7,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center' as const, alignItems: 'center' as const,
};

const pillBlue = {
    backgroundColor: 'rgba(59,130,246,0.12)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
};

const pillOrange = {
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
};
