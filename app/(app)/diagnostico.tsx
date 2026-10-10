import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useConnectivity } from '@/hooks/useConnectivity';
import {
    collectOfflineDiagnostics,
    type DiagnosticsMirrorRow,
    type DiagnosticsOutboxRow,
    type OfflineDiagnostics,
} from '@/services/diagnostics';

/**
 * Lectura tolerante: si algo falla el reporte lo trae adentro; sólo devuelve
 * `null` si ni siquiera se pudo construir, y en ese caso queda el motivo.
 */
function leer(): { reporte: OfflineDiagnostics | null; error: string | null } {
    try {
        return { reporte: collectOfflineDiagnostics(), error: null };
    } catch (caught) {
        return { reporte: null, error: caught instanceof Error ? caught.message : String(caught) };
    }
}

const dos = (valor: number) => String(valor).padStart(2, '0');

const formatFecha = (timestamp: number) => {
    const fecha = new Date(timestamp);
    return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)} ${dos(fecha.getHours())}:${dos(
        fecha.getMinutes()
    )}`;
};

/** «hace 3 min», «hace 2 h»: la antigüedad es lo que importa, no el timestamp. */
const formatEdad = (ms: number) => {
    const segundos = Math.max(0, Math.round(ms / 1000));
    if (segundos < 60) return `hace ${segundos}s`;
    const minutos = Math.round(segundos / 60);
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 48) return `hace ${horas} h`;
    return `hace ${Math.round(horas / 24)} d`;
};

const formatBytes = (bytes: number) => `${bytes} B`;

/**
 * Diagnóstico del modo offline: lo que hay **de verdad** en el SQLite del
 * teléfono (espejo y cola), sin pasar por los hooks ni por la caché de React.
 *
 * Sólo existe en desarrollo (`__DEV__`); en producción muestra un aviso y no
 * expone un solo dato. Es de sólo lectura: sirve para mirar, no para tocar.
 */
export default function DiagnosticoScreen() {
    if (!__DEV__) {
        return (
            <View style={styles.cerrado}>
                <Ionicons name='lock-closed-outline' size={40} color='#9CA3AF' />
                <Text style={styles.cerradoTitulo}>Diagnóstico no disponible</Text>
                <Text style={styles.cerradoTexto}>
                    Esta pantalla existe únicamente en build de desarrollo.
                </Text>
            </View>
        );
    }

    return <DiagnosticoContenido />;
}

function DiagnosticoContenido() {
    const router = useRouter();
    const { accentColor, bg, cardBg, borderColor, textPrimary, textSecondary } = useAccentColor();
    const { state, isOffline, isOnline } = useConnectivity();
    const insets = useSafeAreaInsets();

    // Se lee al montar (no en un efecto): son consultas directas a SQLite, y en
    // una pantalla de diagnóstico el render inicial puede hacer el trabajo.
    const [lectura, setLectura] = useState(leer);
    const [filaAbierta, setFilaAbierta] = useState<string | null>(null);

    const recargar = useCallback(() => setLectura(leer()), []);

    const { reporte, error } = lectura;

    const estado = isOffline ? 'SIN CONEXIÓN' : isOnline ? 'EN LÍNEA' : `POR CONFIRMAR (${state})`;

    const renderSeccion = (
        titulo: string,
        detalle: string,
        contenido: React.ReactNode
    ): React.ReactNode => (
        <View style={[styles.seccion, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.seccionHeader}>
                <Text style={[styles.seccionTitulo, { color: textPrimary }]}>{titulo}</Text>
                <Text style={[styles.seccionDetalle, { color: textSecondary }]}>{detalle}</Text>
            </View>
            {contenido}
        </View>
    );

    const renderMirrorRow = (fila: DiagnosticsMirrorRow) => {
        const abierto = filaAbierta === `mirror:${fila.key}`;

        return (
            <Pressable
                key={fila.key}
                onPress={() => setFilaAbierta(abierto ? null : `mirror:${fila.key}`)}
                style={[styles.fila, { borderColor }]}
            >
                <View style={styles.filaTop}>
                    <Text style={[styles.filaClave, { color: textPrimary }]} numberOfLines={1}>
                        {fila.key}
                    </Text>
                    <Text style={[styles.filaMeta, { color: textSecondary }]}>
                        {formatEdad(fila.ageMs)} · {formatBytes(fila.bytes)}
                    </Text>
                </View>
                <Text style={[styles.filaMeta, { color: textSecondary }]}>
                    guardado {formatFecha(fila.syncedAt)}
                    {fila.source ? ` · origen ${fila.source}` : ''}
                </Text>
                {abierto ? (
                    <Text style={[styles.filaPayload, { color: textSecondary }]} selectable>
                        {fila.preview}
                    </Text>
                ) : null}
            </Pressable>
        );
    };

    const renderOutboxRow = (fila: DiagnosticsOutboxRow) => {
        const abierto = filaAbierta === `outbox:${fila.id}`;
        const color =
            fila.status === 'aplicada'
                ? '#10B981'
                : fila.status === 'fallida'
                  ? '#EF4444'
                  : fila.status === 'enviando'
                    ? '#F59E0B'
                    : accentColor;

        return (
            <Pressable
                key={fila.id}
                onPress={() => setFilaAbierta(abierto ? null : `outbox:${fila.id}`)}
                style={[styles.fila, { borderColor }]}
            >
                <View style={styles.filaTop}>
                    <Text style={[styles.filaClave, { color: textPrimary }]} numberOfLines={1}>
                        {fila.label || fila.type}
                    </Text>
                    <View style={[styles.chip, { backgroundColor: `${color}22` }]}>
                        <Text style={[styles.chipTexto, { color }]}>{fila.status.toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={[styles.filaMeta, { color: textSecondary }]}>
                    {fila.type} · {formatFecha(fila.createdAt)} · {fila.attempts} intento(s)
                    {fila.deviceDate ? ` · op. ${formatFecha(new Date(fila.deviceDate).getTime())}` : ''}
                </Text>
                <Text style={[styles.filaId, { color: textSecondary }]} selectable>
                    {fila.id}
                </Text>
                {fila.lastError ? (
                    <Text style={styles.filaError} numberOfLines={abierto ? undefined : 2}>
                        {fila.lastError}
                    </Text>
                ) : null}
                {abierto ? (
                    <Text style={[styles.filaPayload, { color: textSecondary }]} selectable>
                        {fila.payloadPreview}
                    </Text>
                ) : null}
            </Pressable>
        );
    };

    const db = reporte?.db;

    return (
        <View style={[styles.contenedor, { backgroundColor: bg }]}>
            <PremiumHeader
                title='Diagnóstico offline'
                subtitle='SQLite del dispositivo · sólo lectura'
                onBack={() => router.back()}
                connectionStatus={{ isConnected: isOnline, label: estado }}
            />

            <ScrollView
                contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                <Pressable
                    onPress={recargar}
                    style={[styles.refrescar, { backgroundColor: accentColor }]}
                >
                    <Ionicons name='refresh' size={16} color='#FFFFFF' />
                    <Text style={styles.refrescarTexto}>VOLVER A LEER</Text>
                </Pressable>

                {error ? (
                    <View style={[styles.seccion, { backgroundColor: cardBg, borderColor }]}>
                        <Text style={styles.filaError}>{error}</Text>
                    </View>
                ) : null}

                {db
                    ? renderSeccion(
                          'Base del dispositivo',
                          db.available ? db.name : 'sin almacén local',
                          <View style={styles.kv}>
                              <Text style={[styles.kvFila, { color: textSecondary }]}>
                                  esquema aplicado:{' '}
                                  {db.appliedSchemaVersion ?? '—'} · esperado:{' '}
                                  {db.expectedSchemaVersion}
                              </Text>
                              <Text style={[styles.kvFila, { color: textSecondary }]}>
                                  tablas: {db.tables.length ? db.tables.join(', ') : 'ninguna'}
                              </Text>
                              {db.error ? <Text style={styles.filaError}>{db.error}</Text> : null}
                          </View>
                      )
                    : null}

                {reporte
                    ? renderSeccion(
                          'Espejo (mirror_cache)',
                          `${reporte.mirror.count} fila(s)`,
                          reporte.mirror.count === 0 ? (
                              <Text style={[styles.vacio, { color: textSecondary }]}>
                                  Nada guardado todavía: con red entrá a Cuentas, Caja y Ventas
                                  para que se espeje.
                              </Text>
                          ) : (
                              reporte.mirror.rows.map(renderMirrorRow)
                          )
                      )
                    : null}

                {reporte
                    ? renderSeccion(
                          'Cola de intenciones (outbox)',
                          `${reporte.outbox.total} total · ${reporte.outbox.unresolved} sin resolver`,
                          reporte.outbox.total === 0 ? (
                              <Text style={[styles.vacio, { color: textSecondary }]}>
                                  La cola está vacía.
                              </Text>
                          ) : (
                              reporte.outbox.rows.map(renderOutboxRow)
                          )
                      )
                    : null}

                <Text style={[styles.nota, { color: textSecondary }]}>
                    Tocá una fila para ver su JSON; mantené presionado para copiarlo. Este
                    diagnóstico nunca escribe en la base ni envía nada.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1 },
    contenido: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
    refrescar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        borderRadius: 12,
    },
    refrescarTexto: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.8 },
    seccion: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
    seccionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    seccionTitulo: { flex: 1, fontSize: 14, fontWeight: '800' },
    seccionDetalle: { fontSize: 11, fontWeight: '700' },
    kv: { gap: 4 },
    kvFila: { fontSize: 12, lineHeight: 17 },
    fila: { borderTopWidth: 1, paddingTop: 8, gap: 3 },
    filaTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filaClave: { flex: 1, fontSize: 13, fontWeight: '800' },
    filaMeta: { fontSize: 11 },
    filaId: { fontSize: 10 },
    filaError: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
    filaPayload: { fontSize: 11, lineHeight: 16 },
    chip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
    chipTexto: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
    vacio: { fontSize: 12, lineHeight: 17 },
    nota: { fontSize: 11, lineHeight: 16, paddingHorizontal: 2 },
    cerrado: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 32,
        backgroundColor: '#FFFFFF',
    },
    cerradoTitulo: { fontSize: 17, fontWeight: '800', color: '#111827' },
    cerradoTexto: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19 },
});
