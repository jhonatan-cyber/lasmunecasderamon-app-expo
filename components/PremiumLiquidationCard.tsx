import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo } from 'react';
import {
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useAccentColor } from '../hooks/useAccentColor';

interface Event {
    type: string;
    id: number;
    codigo: string;
    date: string;
    amount: number;
    estado: number;
}

interface User {
    name?: string;
    lastName?: string;
    nick?: string;
}

interface PremiumLiquidationCardProps {
    user: User | null;
    events: Event[];
    title?: string;
    subtitle?: string;
    totalLabel?: string;
    onExportSuccess?: () => void;
}

export function PremiumLiquidationCard({
    user,
    events,
    title = 'Liquidación de Comisiones',
    subtitle = 'Resumen de Actividad',
    totalLabel = 'Acumulado',
    onExportSuccess
}: PremiumLiquidationCardProps) {
    const { accentColor, isDark } = useAccentColor();

    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0, 0, 0, 0.05)';

    const totalCalculated = useMemo(() => {
        return events.reduce((sum, e) => {
            if (e.estado !== undefined && e.estado !== 1) return sum;
            if (e.type === 'anticipo') return sum - (e.amount || 0);
            return sum + (e.amount || 0);
        }, 0);
    }, [events]);

    const handleExportReport = useCallback(async () => {
        try {
            const html = `
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1F2937; }
                        .header { text-align: center; border-bottom: 2px solid ${accentColor}; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo { font-size: 28px; font-weight: 900; color: ${accentColor}; margin-bottom: 5px; }
                        .subtitle { font-size: 14px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
                        .info-box { background: #F9FAFB; padding: 15px; border-radius: 12px; }
                        .info-label { font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
                        .info-value { font-size: 16px; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                        th { text-align: left; background: ${accentColor}; color: white; padding: 12px; font-size: 12px; }
                        td { padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; }
                        .total-row { background: #F3F4F6; }
                        .total-label { font-weight: bold; text-align: right; }
                        .total-value { font-weight: 900; color: #10B981; }
                        .footer { text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 50px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">Las Muñecas de Ramón</div>
                        <div class="subtitle">${title}</div>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-box">
                            <div class="info-label">USUARIO</div>
                            <div class="info-value">${user?.name || ''} ${user?.lastName || ''} ${user?.nick ? `- ${user.nick}` : ''}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">FECHA DE REPORTE</div>
                            <div class="info-value">${new Date().toLocaleString()}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>FECHA Y HORA</th>
                                <th>TIPO</th>
                                <th>CÓDIGO</th>
                                <th style="text-align: right;">MONTO</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${events.map(e => {
                let typeLabel = e.type.toUpperCase();
                if (e.type === 'comision') typeLabel = 'COMISIÓN DE VENTA';
                if (e.type === 'venta') typeLabel = 'VENTA DE PRODUCTO';

                return `
                                    <tr>
                                        <td>${new Date(e.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                        <td>${typeLabel}</td>
                                        <td>${e.codigo}</td>
                                        <td style="text-align: right;">$${(e.amount || 0).toLocaleString()}</td>
                                    </tr>
                                `;
            }).join('')}
                            <tr class="total-row">
                                <td colspan="3" class="total-label">${totalLabel.toUpperCase()}</td>
                                <td class="total-value" style="text-align: right;">$${totalCalculated.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="footer">
                        Este es un documento informativo generado automáticamente.<br/>
                        © ${new Date().getFullYear()} Las Muñecas de Ramón - Sistema de Gestión
                    </div>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });

            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                await Sharing.shareAsync(uri);
            } else {
                await Print.printAsync({ html });
            }
            onExportSuccess?.();
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'No se pudo generar el reporte PDF.');
        }
    }, [user, events, title, totalLabel, totalCalculated, onExportSuccess]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>{subtitle}</Text>
            </View>
            <View style={styles.actionsRow}>
                <View style={[styles.miniSummary, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.label, { color: textSecondary }]}>{totalLabel}</Text>
                    <Text style={[styles.value, { color: '#10B981' }]}>${totalCalculated.toLocaleString()}</Text>
                </View>
                <Pressable
                    onPress={handleExportReport}
                    style={[styles.exportBtn, { backgroundColor: accentColor }]}
                    accessibilityLabel="Exportar Liquidación a PDF"
                    accessibilityRole="button"
                >
                    <Ionicons name="document-text-outline" size={20} color="#FFF" />
                    <Text style={styles.exportBtnText}>Reportes</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20
    },
    miniSummary: {
        flex: 1,
        padding: 15,
        borderRadius: 20,
        borderWidth: 1.5,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase'
    },
    value: {
        fontSize: 24,
        fontWeight: '800',
        marginTop: 4
    },
    exportBtn: {
        flex: 1,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8
    },
    exportBtnText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 15
    }
});
