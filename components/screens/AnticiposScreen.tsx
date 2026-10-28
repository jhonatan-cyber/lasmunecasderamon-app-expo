import { styles } from "./AnticiposScreen.styles";
import { EmployeeListError } from "@/components/shared/EmployeeListError";
import { AdvanceCard } from "@/components/ui/AdvanceCard";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { useAccentColor } from "@/hooks/useAccentColor";
import { Anticipo, useAnticipos } from "@/hooks/useAnticipos";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useState, useCallback } from "react";

import { showToast } from "@/utils/toast-lazy";
import {
  calcularTotales,
  filtrarAnticipos,
  normalizeEstado,
  type FiltroAnticipos,
  type VistaAnticipos,
} from "@/components/screens/anticipos/anticiposUtils";
import { AnticiposViewTabs } from "@/components/screens/anticipos/AnticiposViewTabs";
import { AnticiposSummaryCard } from "@/components/screens/anticipos/AnticiposSummaryCard";
import { AnticiposFilterRow } from "@/components/screens/anticipos/AnticiposFilterRow";
import { SolicitarAnticipoModal } from "@/components/screens/anticipos/SolicitarAnticipoModal";

export default function AnticiposScreen() {
  const {
    accentColor,
    isDark,
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
  } = useAccentColor();
  const {
    solicitudes,
    pagos,
    loading,
    refreshing,
    error,
    montoMaximo,
    montoAsistencia,
    montoComisiones,
    montoPropinas,
    tieneSolicitudPendiente,
    fetchMaximo,
    solicitarAnticipo,
    onRefresh,
  } = useAnticipos();

  const [filter, setFilter] = useState<FiltroAnticipos>("todos");
  const [viewMode, setViewMode] = useState<VistaAnticipos>("anticipos");
  const [modalVisible, setModalVisible] = useState(false);
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const canRequestAdvance = montoMaximo > 0;

  const handleMontoChange = (text: string) => {
    const cleanNumber = text.replace(/[^0-9]/g, "");
    if (!cleanNumber) {
      setMonto("");
      return;
    }
    setMonto(parseInt(cleanNumber, 10).toLocaleString("de-DE"));
  };

  const handleSolicitar = async () => {
    const montoNum = parseFloat(monto.replace(/\./g, ""));
    if (!montoNum || montoNum <= 0) {
      showToast({
        type: "error",
        text1: "Error",
        text2: "Ingresa un monto válido",
      });
      return;
    }
    if (montoNum > montoMaximo) {
      showToast({
        type: "error",
        text1: "Error",
        text2: `El monto máximo es $${montoMaximo.toLocaleString()}`,
      });
      return;
    }
    setSendingRequest(true);
    const success = await solicitarAnticipo(montoNum, motivo);
    if (success) {
      setModalVisible(false);
      setMonto("");
      setMotivo("");
    }
    setSendingRequest(false);
  };

  const openSolicitarModal = async () => {
    const availability = await fetchMaximo();
    if (!availability) {
      showToast({
        type: "error",
        text1: "Error",
        text2: "No se pudo cargar el saldo disponible. Reintenta.",
      });
      return;
    }
    if (availability.tiene_solicitud_pendiente) {
      showToast({
        type: "info",
        text1: "Solicitud pendiente",
        text2: "Ya tienes una solicitud en espera",
      });
      return;
    }
    if (Number(availability.monto_maximo || 0) <= 0) {
      showToast({
        type: "warning",
        text1: "Sin saldo disponible",
        text2: "No tienes monto disponible para solicitar anticipo",
      });
      return;
    }
    setModalVisible(true);
  };

  const filteredData = filtrarAnticipos({
    viewMode,
    filter,
    solicitudes,
    pagos,
  });
  const { totalPendiente, totalEnCaja, totalPagado } = calcularTotales(
    solicitudes,
    pagos,
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Anticipo; index: number }) => (
      <AdvanceCard
        item={item}
        index={index}
        showIndexBadge={false}
        compactDate={true}
        viewMode={viewMode}
        normalizeEstado={normalizeEstado}
      />
    ),
    [viewMode],
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader title="Anticipos" />
        <View style={{ margin: 16 }}>
          <SkeletonLoader width="100%" height={140} borderRadius={16} />
        </View>
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2].map((i) => (
            <SkeletonLoader
              key={i}
              width="100%"
              height={100}
              borderRadius={16}
            />
          ))}
        </View>
      </View>
    );
  }

  if (error)
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader title="Anticipos" />
        <EmployeeListError message={error} onRetry={onRefresh} />
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader
        title="Anticipos"
        subtitle="Mis solicitudes y anticipos recibidos"
      />

      <AnticiposViewTabs
        viewMode={viewMode}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        onChange={setViewMode}
      />

      <AnticiposSummaryCard
        viewMode={viewMode}
        totalPendiente={totalPendiente}
        totalEnCaja={totalEnCaja}
        totalPagado={totalPagado}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textSecondary={textSecondary}
      />

      {viewMode === "solicitudes" && (
        <AnticiposFilterRow
          filter={filter}
          accentColor={accentColor}
          cardBg={cardBg}
          borderColor={borderColor}
          textSecondary={textSecondary}
          onChange={setFilter}
        />
      )}

      <FlatList
        data={filteredData}
        keyExtractor={(item) =>
          (item.id_solicitud || (item as any).id_anticipo).toString()
        }
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
            <Ionicons name="card-outline" size={48} color={textSecondary} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              No se encontraron anticipos
            </Text>
          </View>
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: accentColor }]}
        accessibilityRole="button"
        accessibilityLabel="Solicitar anticipo"
        onPress={openSolicitarModal}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <SolicitarAnticipoModal
        visible={modalVisible}
        isDark={isDark}
        bg={bg}
        cardBg={cardBg}
        borderColor={borderColor}
        accentColor={accentColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        montoMaximo={montoMaximo}
        montoAsistencia={montoAsistencia}
        montoComisiones={montoComisiones}
        montoPropinas={montoPropinas}
        tieneSolicitudPendiente={tieneSolicitudPendiente}
        monto={monto}
        motivo={motivo}
        sendingRequest={sendingRequest}
        canRequestAdvance={canRequestAdvance}
        onChangeMonto={handleMontoChange}
        onChangeMotivo={setMotivo}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSolicitar}
      />
    </View>
  );
}
