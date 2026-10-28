import { View } from "react-native";
import { GarzonActionCard } from "@/components/garzon/GarzonActionCard";
import { BloqueoPorCaja } from "@/components/shared/BloqueoPorCaja";
import { rutaExigeCajaAbierta } from "@/utils/cajaGate";

interface GarzonHomeActionsProps {
  bloqueado: boolean;
  accentColor: string;
  onOpenPedidos: () => void;
  onOpenServicios: () => void;
  onOpenEntradas: () => void;
}

export function GarzonHomeActions({
  bloqueado,
  accentColor,
  onOpenPedidos,
  onOpenServicios,
  onOpenEntradas,
}: GarzonHomeActionsProps) {
  return (
    <>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 15 }}>
        <BloqueoPorCaja
          bloqueado={bloqueado && rutaExigeCajaAbierta("/garzon/pedidos")}
          style={{ flex: 1 }}
        >
          <GarzonActionCard
            title="PEDIDOS"
            description="Gestión de comandas"
            icon="beer"
            color={accentColor}
            onPress={onOpenPedidos}
          />
        </BloqueoPorCaja>
        <BloqueoPorCaja
          bloqueado={bloqueado && rutaExigeCajaAbierta("/garzon/servicios")}
          style={{ flex: 1 }}
        >
          <GarzonActionCard
            title="SERVICIOS"
            description="Atenciones activas"
            icon="bed"
            color="#10B981"
            onPress={onOpenServicios}
          />
        </BloqueoPorCaja>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <BloqueoPorCaja
          bloqueado={bloqueado && rutaExigeCajaAbierta("/garzon/entradas")}
          style={{ flex: 1 }}
        >
          <GarzonActionCard
            title="ENTRADAS"
            description="Cobro en la puerta"
            icon="ticket-outline"
            color="#F59E0B"
            onPress={onOpenEntradas}
          />
        </BloqueoPorCaja>
      </View>
    </>
  );
}
