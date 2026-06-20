import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  selectedClient: any;
  loadingClient: boolean;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  textPrimary: string;
  textSecondary: string;
}

export function ServiceClientCard({
  selectedClient,
  loadingClient,
  accentColor,
  accentBg,
  accentBorder,
  textPrimary,
  textSecondary,
}: Props) {
  if (loadingClient) {
    return (
      <View style={{ marginBottom: 15, padding: 12, borderRadius: 12, backgroundColor: accentBg, borderWidth: 1, borderColor: accentBorder }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Skeleton width={32} height={32} borderRadius={16} />
            <View style={{ gap: 4 }}>
              <Skeleton width={100} height={14} />
              <Skeleton width={60} height={10} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Skeleton width={80} height={10} />
            <Skeleton width={60} height={18} />
          </View>
        </View>
      </View>
    );
  }

  if (!selectedClient) return null;

  return (
    <View style={{ marginBottom: 15, padding: 12, borderRadius: 12, backgroundColor: accentBg, borderWidth: 1, borderColor: accentBorder }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${accentColor}20`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person" size={18} color={accentColor} />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 13 }}>{selectedClient.name} {selectedClient.lastName}</Text>
            <Text style={{ color: textSecondary, fontSize: 10 }}>Cliente frecuente</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '800' }}>SALDO DISPONIBLE</Text>
          <Text style={{ color: Number(selectedClient.saldo) > 0 ? '#10B981' : textSecondary, fontSize: 16, fontWeight: '900' }}>
            ${Number(selectedClient.saldo || 0).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}
