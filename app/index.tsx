import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
    const user = useAuthStore((state) => state.user);

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    const roleName = typeof user.role === 'string' ? user.role : (user.role as any)?.name || '';
    const role = roleName.toLowerCase();

    if (role.includes('garzon')) {
        return <Redirect href="/(app)/garzon/(tabs)" />;
    } else if (role.includes('anfitriona')) {
        return <Redirect href="/(app)/anfitriona/(tabs)" />;
    } else if (role.includes('cajero') || role.includes('admin')) {
        return <Redirect href="/(app)/cajero/(tabs)" />;
    }

    return <Redirect href="/(app)/garzon/(tabs)" />;
}
