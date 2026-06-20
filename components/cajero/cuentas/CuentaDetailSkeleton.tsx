import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CuentaDetailSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 25 }}>
        <View>
          <Skeleton width={180} height={28} style={{ marginBottom: 10 }} />
          <Skeleton width={120} height={18} />
        </View>
        <Skeleton width={44} height={44} borderRadius={22} />
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
        <Skeleton style={{ flex: 1 }} height={65} borderRadius={18} />
        <Skeleton style={{ flex: 1 }} height={65} borderRadius={18} />
      </View>

      <Skeleton width={140} height={20} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 25 }}>
        <Skeleton width={90} height={32} borderRadius={16} />
        <Skeleton width={90} height={32} borderRadius={16} />
      </View>

      <Skeleton width="100%" height={180} borderRadius={24} style={{ marginBottom: 25 }} />

      <View style={{ gap: 15 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton width={100} height={18} />
          <Skeleton width={80} height={18} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton width={120} height={26} />
          <Skeleton width={140} height={32} borderRadius={16} />
        </View>
      </View>
    </View>
  );
}
