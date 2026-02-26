import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    Text as RNText,
    ScrollView,
    StyleSheet,
    useColorScheme,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../../../api/client';
import { CajeroActionGrid } from '../../../../components/CajeroActionGrid';
import { CajeroStats } from '../../../../components/CajeroStats';
import { PremiumHeaderActions } from '../../../../components/PremiumHeaderActions';
import { PremiumUserProfile } from '../../../../components/PremiumUserProfile';
import { useAuthStore } from '../../../../store/authStore';

export default function CajeroHomeScreen() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [userStatus, setUserStatus] = useState<number>(1);
    const [hasNewAlert, setHasNewAlert] = useState(false);
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger'; onConfirm?: () => void; showCancel?: boolean }>({ visible: false, title: '', message: '', type: 'info' });

    const bg = isDark ? '#000000' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info', onConfirm?: () => void, showCancel = false) => {
        setAlertConfig({ visible: true, title, message, type, onConfirm, showCancel });
    };

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, userRes, pendingRes] = await Promise.all([
                apiClient('/caja/stats'),
                apiClient('/auth/me'),
                apiClient('/solicitudes-servicios/pending-count')
            ]);

            if (statsRes) setStats(statsRes);

            if (userRes.success && userRes.user) {
                useAuthStore.getState().updateProfile(userRes.user);
            }

            if (pendingRes.success) {
                setPendingCount(pendingRes.count || 0);
            }

            const statusRes = await apiClient('/users/status');
            if (statusRes.success && statusRes.status) {
                setUserStatus(statusRes.status);
            }
        } catch (error) {
            console.error('Error fetching cajero data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
            >
                <LinearGradient
                    colors={isDark ? ['#1E1B4B', '#000000'] : ['#E0E7FF', '#F3F4F6']}
                    style={[styles.header, { paddingTop: insets.top + 10 }]}
                >
                    <PremiumHeaderActions
                        hasNewAlert={hasNewAlert}
                        notificationCount={pendingCount}
                        setHasNewAlert={setHasNewAlert}
                        onNotificationPress={() => router.push('/cajero/solicitudes')}
                        showAlert={showAlert}
                        profilePath="/cajero/perfil"
                    />
                    <PremiumUserProfile user={user} userStatus={userStatus} />
                </LinearGradient>

                <CajeroStats stats={stats} />

                <CajeroActionGrid />

                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal transparent visible={alertConfig.visible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.alertCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
                        <View style={[
                            styles.alertIconBg,
                            { backgroundColor: alertConfig.type === 'success' ? '#10B98120' : alertConfig.type === 'danger' ? '#EF444420' : '#8B5CF620' }
                        ]}>
                            <Ionicons
                                name={alertConfig.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                                size={40}
                                color={alertConfig.type === 'success' ? '#10B981' : alertConfig.type === 'danger' ? '#EF4444' : '#8B5CF6'}
                            />
                        </View>
                        <RNText style={[styles.alertTitle, { color: textPrimary }]}>{alertConfig.title}</RNText>
                        <RNText style={[styles.alertMessage, { color: textSecondary }]}>{alertConfig.message}</RNText>
                        <View style={styles.alertActions}>
                            {alertConfig.showCancel && (
                                <Pressable
                                    style={[styles.alertBtn, { backgroundColor: 'transparent', flex: 1 }]}
                                    onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                                >
                                    <RNText style={[styles.alertBtnText, { color: textSecondary }]}>Cancelar</RNText>
                                </Pressable>
                            )}
                            <Pressable
                                style={[styles.alertBtn, { backgroundColor: '#8B5CF6', flex: 1.5 }]}
                                onPress={() => {
                                    setAlertConfig(prev => ({ ...prev, visible: false }));
                                    alertConfig.onConfirm?.();
                                }}
                            >
                                <RNText style={styles.alertBtnText}>Aceptar</RNText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    alertCard: { width: '85%', borderRadius: 32, padding: 24, alignItems: 'center' },
    alertIconBg: { width: 80, height: 80, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    alertTitle: { fontSize: 22, fontWeight: '900', marginBottom: 10 },
    alertMessage: { textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 25, paddingHorizontal: 10 },
    alertActions: { flexDirection: 'row', gap: 12, width: '100%' },
    alertBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    alertBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
