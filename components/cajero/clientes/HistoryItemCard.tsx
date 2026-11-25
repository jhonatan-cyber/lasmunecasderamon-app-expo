import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontFamily } from '@/constants/fonts';
import { Text, View } from 'react-native';
import { useRenderCount } from '@/hooks/useRenderCount';
import { useAccentColor } from '@/hooks/useAccentColor';
import { StatusBadge, paymentIconFor } from '@/components/ui/StatusBadge';

interface Props {
    item: any;
    index: number;
    isDark: boolean;
    textPrimary: string;
    textSecondary: string;
}

export const HistoryItemCard = React.memo(function HistoryItemCard({ item, index, isDark, textPrimary, textSecondary }: Props) {
    const { accentOnSurface, accentUi, surfaceMuted } = useAccentColor();
    useRenderCount('HistoryItemCard', { itemId: item.id, category: item.category });
    const isCarga = item.category === 'CARGA';
    const isServicio = item.category === 'SERVICIO';
    const isConsumo = item.category === 'CONSUMO';
    const iconColor = accentUi;
    const iconBg = surfaceMuted;
    const iconName = isCarga ? 'arrow-up-circle' : isServicio ? 'bed' : 'cart';
    const categoryLabel = isCarga ? 'Carga de Saldo' : isServicio ? 'Servicio' : 'Consumo';
    const cardBg = surfaceMuted;
    const cardBorder = surfaceMuted;

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
                            <Text style={{ fontSize: 15, fontFamily: FontFamily.black, color: textPrimary, letterSpacing: -0.2 }}>
                                {categoryLabel}
                            </Text>
                            <Text style={{ fontSize: 11, fontFamily: FontFamily.semibold, color: textSecondary, marginTop: 1 }}>
                                {new Date(item.fecha_crea).toLocaleString('es-CL', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </Text>
                        </View>
                        <View style={{
                            backgroundColor: cardBg,
                            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
                        }}>
                            <Text style={{ fontSize: 15, fontFamily: FontFamily.black, color: accentOnSurface }}>
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
                    backgroundColor: cardBg,
                    borderColor: accentUi,
                }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                        {item.detalle.habitacion && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={miniBoxBlue}>
                                    <Ionicons name="bed-outline" size={14} color={accentUi} />
                                </View>
                                <View>
                                    <DetailLabel text="Habitación" color={accentOnSurface} />
                                    <DetailVal value={item.detalle.habitacion} color={textPrimary} />
                                </View>
                            </View>
                        )}
                        {item.detalle.tiempo && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={miniBoxBlue}>
                                    <Ionicons name="timer-outline" size={14} color={accentUi} />
                                </View>
                                <View>
                                    <DetailLabel text="Duración" color={accentOnSurface} />
                                    <DetailVal value={`${item.detalle.tiempo} min`} color={textPrimary} />
                                </View>
                            </View>
                        )}
                    </View>
                    {Array.isArray(item.detalle.anfitrionas) && item.detalle.anfitrionas.length > 0 && (
                        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View style={miniBoxBlue}>
                                <Ionicons name="people-outline" size={14} color={accentUi} />
                            </View>
                            {item.detalle.anfitrionas.map((name: string, i: number) => (
                                <View key={i} style={pillBlue}>
                                    <Text style={{ fontSize: 11, fontFamily: FontFamily.extrabold, color: accentOnSurface }}>{name}</Text>
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
                            backgroundColor: cardBg,
                            borderColor: accentUi,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                                <View style={miniBoxOrange}>
                                    <Ionicons name="fast-food-outline" size={12} color={accentUi} />
                                </View>
                                <DetailLabel text="Productos" color={accentOnSurface} />
                            </View>
                            {item.detalle.productos.map((p: any, idx: number) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3, gap: 6 }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accentUi }} />
                                    <Text style={{ fontSize: 13, color: textPrimary, fontFamily: FontFamily.bold }}>
                                        {p.cantidad || 1}x {p.nombre || 'Producto'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                    {Array.isArray(item.detalle.anfitrionas) && item.detalle.anfitrionas.length > 0 && (
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View style={miniBoxOrange}>
                                <Ionicons name="people-outline" size={14} color={accentUi} />
                            </View>
                            {item.detalle.anfitrionas.map((name: string, i: number) => (
                                <View key={i} style={pillOrange}>
                                    <Text style={{ fontSize: 11, fontFamily: FontFamily.extrabold, color: accentOnSurface }}>{name}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <StatusBadge
                    label={item.metodo_pago || 'pago'}
                    color={textSecondary}
                    bg={surfaceMuted}
                    borderColor="transparent"
                    icon={paymentIconFor(item.metodo_pago)}
                    iconColor={textSecondary}
                    textColor={textSecondary}
                    uppercase
                    style={{ borderRadius: 8 }}
                />
            </View>
        </View>
    );
});
HistoryItemCard.displayName = 'HistoryItemCard';

function DetailLabel({ text, color }: { text: string; color: string }) {
    return (
        <Text style={{ fontSize: 8, fontFamily: FontFamily.extrabold, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {text}
        </Text>
    );
}

function DetailVal({ value, color }: { value: string; color: string }) {
    return <Text style={{ fontSize: 13, fontFamily: FontFamily.black, color }}>{value}</Text>;
}

const miniBoxBlue = {
    width: 26, height: 26, borderRadius: 8,
    justifyContent: 'center' as const, alignItems: 'center' as const,
};

const miniBoxOrange = {
    width: 22, height: 22, borderRadius: 7,
    justifyContent: 'center' as const, alignItems: 'center' as const,
};

const pillBlue = {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
};

const pillOrange = {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
};
