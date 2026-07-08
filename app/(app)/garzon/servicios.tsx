import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccentColor } from '@/hooks/useAccentColor';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useGarzonServiciosScreen } from '@/hooks/useGarzonServiciosScreen';
import { GarzonServicioSummary, GarzonServiciosModales } from '@/components/garzon/servicios';

function ServiciosSkeleton({ bg, gradientColors, insets }: { bg: string; gradientColors: string[]; insets: { top: number } }) {
    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <LinearGradient
                colors={gradientColors as unknown as readonly [string, string, ...string[]]}
                style={[styles.header, {
                    paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20),
                    paddingBottom: 25,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                    height: 160
                }]}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 20 }}>
                    <Skeleton width={150} height={30} />
                    <Skeleton width={44} height={44} borderRadius={22} />
                </View>
                <View style={{ paddingHorizontal: 20 }}>
                    <Skeleton width="60%" height={24} />
                </View>
            </LinearGradient>

            <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={{ marginBottom: 20, gap: 10 }}>
                        <Skeleton width={100} height={18} />
                        <Skeleton width="100%" height={56} borderRadius={16} />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

export default function ServiciosScreen() {
    const { accentColor, gradientColors, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const primaryColor = accentColor;

    const {
        rooms,
        anfitrionas,
        clients,
        loading,
        refreshing,
        submitting,
        selectedRoom,
        setSelectedRoom,
        selectedHostesses,
        selectedClients,
        servicePrice,
        setServicePrice,
        paymentMethod,
        setPaymentMethod,
        roomModalVisible,
        setRoomModalVisible,
        hostessModalVisible,
        setHostessModalVisible,
        clientModalVisible,
        setClientModalVisible,
        hasComision,
        maxHostesses,
        maxClients,
        activeClientWithBalance,
        hasPrepago,
        totals,
        onRefresh,
        toggleHostess,
        toggleClient,
        handleSubmit,
        formatNumber
    } = useGarzonServiciosScreen();

    if (loading) return <ServiciosSkeleton bg={bg} gradientColors={gradientColors} insets={insets} />;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: bg }}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
            >
                <PremiumHeader 
                    title="Servicios"
                    subtitle="Registrar nuevo servicio en habitación"
                    rightComponent={
                        <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.backTextHeader}>Atrás</Text>
                        </Pressable>
                    }
                />

                <View style={{ padding: 20 }}>

                <Text style={[styles.sectionLabel, { color: textSecondary }]}>HABITACIÓN</Text>
                <Pressable 
                    onPress={() => setRoomModalVisible(true)}
                    style={[styles.selectField, { backgroundColor: cardBg, borderColor: selectedRoom ? primaryColor : borderColor }]}
                >
                    <View style={styles.selectFieldContent}>
                        <Ionicons name="business-outline" size={20} color={selectedRoom ? primaryColor : textSecondary} />
                        <Text style={[styles.selectFieldText, { color: selectedRoom ? textPrimary : textSecondary }]}>
                            {selectedRoom 
                                ? `${selectedRoom.nombre || selectedRoom.name || selectedRoom.numero} - $${(selectedRoom.precio || selectedRoom.price || 0).toLocaleString()}`
                                : 'Seleccionar habitación...'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={textSecondary} />
                </Pressable>

                {hasComision && (
                    <View style={{ backgroundColor: primaryColor + '15', padding: 12, borderRadius: 16, marginTop: 15, borderWidth: 1, borderColor: primaryColor + '40' }}>
                        <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 13, textAlign: 'center' }}>
                            ✨ Límite: Máx 3 Anfitrionas y 4 personas en total
                        </Text>
                    </View>
                )}

                <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    ANFITRIONAS {hasComision && `(MÁX ${maxHostesses})`}
                </Text>
                <Pressable 
                    onPress={() => setHostessModalVisible(true)}
                    style={[styles.selectField, { backgroundColor: cardBg, borderColor: selectedHostesses.length > 0 ? primaryColor : borderColor }]}
                >
                    <View style={styles.selectFieldContent}>
                        <Ionicons name="people-outline" size={20} color={selectedHostesses.length > 0 ? primaryColor : textSecondary} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.selectFieldText, { color: selectedHostesses.length > 0 ? textPrimary : textSecondary }]} numberOfLines={1}>
                                {selectedHostesses.length > 0 
                                    ? selectedHostesses.map(id => {
                                        const anf = anfitrionas.find(a => 
                                            String(a.id_usuario || a.id) === String(id)
                                        );
                                        return anf?.nick || anf?.nombre || anf?.name || '';
                                    }).filter(Boolean).join(', ')
                                    : 'Seleccionar anfitrionas...'}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={textSecondary} />
                </Pressable>

                <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                    CLIENTES (OPCIONAL {hasComision && `- MÁX ${maxClients}`})
                </Text>
                <Pressable 
                    onPress={() => setClientModalVisible(true)}
                    style={[styles.selectField, { backgroundColor: cardBg, borderColor: selectedClients.length > 0 ? primaryColor : borderColor }]}
                >
                    <View style={styles.selectFieldContent}>
                        <Ionicons name="person-outline" size={20} color={selectedClients.length > 0 ? primaryColor : textSecondary} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.selectFieldText, { color: selectedClients.length > 0 ? textPrimary : textSecondary }]} numberOfLines={1}>
                                {selectedClients.length > 0 
                                    ? selectedClients.map(id => {
                                        const cli = clients.find(c => 
                                            String(c.id_cliente) === String(id) || 
                                            String(c.id) === String(id)
                                        );
                                        return `${cli?.nombre || cli?.name || ''} ${cli?.apellido || cli?.lastName || ''}`.trim();
                                    }).filter(Boolean).join(', ')
                                    : 'Seleccionar clientes...'}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={textSecondary} />
                </Pressable>

                <View style={styles.formSection}>
                    {!hasComision && (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: textSecondary }]}>
                                PRECIO DE SERVICIO
                            </Text>
                            <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
                                <Text style={{ color: textSecondary, fontSize: 18, marginRight: 8 }}>$</Text>
                                <TextInput
                                    style={[styles.input, { color: textPrimary }]}
                                    placeholder="0"
                                    placeholderTextColor={textSecondary}
                                    keyboardType="numeric"
                                    value={servicePrice}
                                    onChangeText={(val) => setServicePrice(formatNumber(val))}
                                />
                            </View>
                        </View>
                    )}

                    {!hasPrepago && (
                        <>
                            <Text style={[styles.sectionLabel, { color: textSecondary }]}>MÉTODO DE PAGO</Text>
                            <View style={styles.methodContainer}>
                                {['efectivo', 'tarjeta', 'transferencia'].map((m) => (
                                    <Pressable
                                        key={m}
                                        onPress={() => setPaymentMethod(m as any)}
                                        style={[
                                            styles.methodBtn,
                                            { backgroundColor: cardBg, borderColor: paymentMethod === m ? primaryColor : borderColor },
                                            paymentMethod === m && { borderWidth: 2 }
                                        ]}
                                    >
                                        <Text style={[styles.methodText, { color: paymentMethod === m ? primaryColor : textPrimary }]}>
                                            {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}

                    {hasPrepago && (
                        <View style={{ backgroundColor: '#10B98115', padding: 15, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#10B981' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Ionicons name="wallet" size={20} color="#10B981" />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 14 }}>
                                        PAGO AUTOMÁTICO CON SALDO
                                    </Text>
                                    <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 12 }}>
                                        Saldo disponible: ${(activeClientWithBalance?.saldo || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {paymentMethod === 'tarjeta' && !hasComision && (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: textSecondary }]}>IVA (INC. REDONDEO)</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor, opacity: 0.7 }]}>
                                <Text style={{ color: textSecondary, fontSize: 18, marginRight: 8 }}>$</Text>
                                <TextInput
                                    style={[styles.input, { color: textPrimary }]}
                                    value={formatNumber(totals.iva.toString())}
                                    editable={false}
                                />
                            </View>
                        </View>
                    )}
                </View>

                <GarzonServicioSummary
                    totals={totals}
                    hasComision={hasComision}
                    selectedHostessesCount={selectedHostesses.length}
                    paymentMethod={paymentMethod}
                    primaryColor={primaryColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                />

                <Pressable
                    onPress={handleSubmit}
                    disabled={submitting}
                    style={({ pressed }) => [
                        styles.submitBtn,
                        { backgroundColor: primaryColor },
                        (submitting || pressed) && { opacity: 0.8 }
                    ]}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitText}>SOLICITAR SERVICIO</Text>
                    )}
                </Pressable>
                </View>
            </ScrollView>

            <GarzonServiciosModales
                roomModalVisible={roomModalVisible}
                setRoomModalVisible={setRoomModalVisible}
                rooms={rooms.filter(r => 
                    r.status === 1 && 
                    (r.precio || r.price || 0) > 0 && 
                    (r.tiempo || r.time || 0) > 0
                ).map(r => ({
                    ...r,
                    nombre: r.nombre || r.name || r.numero,
                    precio: r.precio || r.price || 0,
                    tiempo: r.tiempo || r.time || 0,
                    estado: r.status
                }))}
                selectedRoom={selectedRoom}
                setSelectedRoom={setSelectedRoom}
                setServicePrice={setServicePrice}
                hostessModalVisible={hostessModalVisible}
                setHostessModalVisible={setHostessModalVisible}
                anfitrionas={anfitrionas}
                selectedHostesses={selectedHostesses}
                toggleHostess={toggleHostess}
                maxHostesses={maxHostesses}
                clientModalVisible={clientModalVisible}
                setClientModalVisible={setClientModalVisible}
                clients={clients}
                selectedClients={selectedClients}
                toggleClient={toggleClient}
                maxClients={maxClients}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        paddingHorizontal: 20,
    },
    backBtnRight: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        gap: 6
    },
    backTextHeader: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    selectField: {
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    selectFieldContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1
    },
    selectFieldText: {
        fontSize: 16,
        fontWeight: '700',
    },
    sectionLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: 24, marginBottom: 12 },
    formSection: { gap: 10 },
    inputGroup: { gap: 8 },
    inputLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    inputWrapper: { height: 56, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    input: { flex: 1, fontSize: 18, fontWeight: '700' },
    methodContainer: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    methodBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    methodText: { fontSize: 12, fontWeight: '800' },
    submitBtn: { height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});
