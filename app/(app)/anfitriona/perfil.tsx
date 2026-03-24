import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { PremiumProfileView } from '@/components/shared/PremiumProfileView';

export default function PerfilScreen() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await apiClient('/users/me/stats');
            if (res.success) {
                setStats(res.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    return (
        <PremiumProfileView />
    );
}
