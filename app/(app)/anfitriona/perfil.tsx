import { useEffect, useState } from 'react';
import { apiClient } from '../../../api/client';
import { PremiumProfileView } from '../../../components/PremiumProfileView';

export default function PerfilScreen() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const res = await apiClient('/events/stats');
            if (res.success) setStats(res.data);
        };
        fetchStats();
    }, []);

    return (
        <PremiumProfileView
            roleLabel="Anfitriona"
            showStats={true}
            stats={{
                svcCount: stats?.svcCount,
                rating: 4.9
            }}
            avatarEmoji="👤"
        />
    );
}
