import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
export default function CuentasScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    return (
        <ScrollView style={[styles.container, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
            <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>📄 Cuentas Pendientes</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Cuentas sin pagar</Text>
            <View style={[styles.emptyCard, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                <Text style={[styles.emptyText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>Sin cuentas pendientes</Text>
            </View>
        </ScrollView>
    );
}
const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
    subtitle: { fontSize: 14, marginBottom: 24 },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 15 },
});
