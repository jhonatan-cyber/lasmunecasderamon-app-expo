import { ServiceCard } from "@/components/anfitriona/ServiceCard";
import { ServiceDetailModal } from "@/components/anfitriona/ServiceDetailModal";
import VirtualizedList from "@/components/shared/VirtualizedList";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAccentColor } from "@/hooks/useAccentColor";
import { Servicio,useServicios } from "@/hooks/useServicios";
import { tabBarBottomPadding } from "@/constants/layout";
import { BorderRadius, FontSize } from "@/constants/spacing";
import { FontFamily } from "@/constants/fonts";
import { useCallback,useState } from "react";
import {
RefreshControl,
StyleSheet,
Text,
View,
} from "react-native";

export default function ServiciosScreen() {
  const {accentColor, bg, cardBg, textSecondary, borderColor, accentOnSurface} = useAccentColor();
  const {
    servicios,
    loading,
    refreshing,
    error,
    onRefresh,
    handleAssistance,
    fetchData,
  } = useServicios();

  const [filter, setFilter] = useState<
    "all" | "pendiente" | "finalizado" | "anulado"
  >("all");
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(
    null,
  );
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "warning" as "info" | "success" | "warning" | "danger",
    onConfirm: () => {},
    showCancel: true,
  });



  const onConfirmAssistance = useCallback((
    servicioId: number,
    roomName: string,
    type: string,
  ) => {
    if (type === "Seguridad") {
      setAlertConfig({
        visible: true,
        title: "Confirmar Alerta",
        message: `¿Estás seguro de enviar una ALERTA de seguridad para la habitación ${roomName}?`,
        type: "danger",
        onConfirm: () => {
          handleAssistance(servicioId, roomName, type);
          setAlertConfig((prev) => ({ ...prev, visible: false }));
        },
        showCancel: true,
      });
    } else {
      handleAssistance(servicioId, roomName, type);
    }
  }, [handleAssistance]);

  const filteredData = servicios
    .filter((s) => s?.id_servicio)
    .filter((s) => {
      const estadoNum = Number(s.estado);
      if (filter === "pendiente") return [2, 3, 4].includes(estadoNum);
      if (filter === "finalizado") return estadoNum === 1;
      if (filter === "anulado") return estadoNum === 0;
      return true;
    })
    .filter((s) => {
      if (!searchText.trim()) return true;
      const search = searchText.toLowerCase();
      return (
        s.habitacion?.toLowerCase().includes(search) ||
        s.codigo?.toLowerCase().includes(search) ||
        String(s.id_servicio).includes(search)
      );
    });

  const finalizados = servicios.filter(
    (s) => s?.id_servicio && Number(s.estado) === 1,
  );
  const anulados = servicios.filter(
    (s) => s?.id_servicio && Number(s.estado) === 0,
  );
  const pendientes = servicios.filter(
    (s) => s?.id_servicio && [2, 3, 4].includes(Number(s.estado)),
  );
  const totalACobrar = finalizados.reduce(
    (sum, s) => sum + Number(s.comision_usuario || 0),
    0,
  );
  const totalEstimado = servicios.filter(s => Number(s.estado) !== 0).reduce(
    (sum, s) => sum + Number(s?.comision_usuario || 0),
    0,
  );

  const handlePressItem = useCallback((item: Servicio) => {
    setSelectedServicio(item);
    setModalVisible(true);
  }, []);

  const renderServicio = useCallback(
    ({ item, index }: { item: Servicio; index: number }) => (
      <ServiceCard
        item={item}
        index={index}
        onPress={handlePressItem}
        onAssistance={onConfirmAssistance}
      />
    ),
    [handlePressItem, onConfirmAssistance],
  );

  if (loading)
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <PremiumHeader title="Servicios" />
        <View style={{ padding: 16 }}>
          <Skeleton width="100%" height={120} borderRadius={16} />
        </View>
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={100} borderRadius={16} />
          ))}
        </View>
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <PremiumHeader title="Servicios" subtitle="Mi historial de atención" />

      <View
        style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}
      >
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          COMISIONES DE SERVICIOS FINALIZADOS
        </Text>
        <Text style={[styles.summaryAmount, { color: accentOnSurface }]}>
          ${totalACobrar.toLocaleString()}
        </Text>
        <View style={styles.summaryDetails}>
          <Text style={[styles.summaryDetail, { color: textSecondary }]}>
            Historial: ${totalEstimado.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <SearchBar
          placeholder="Buscar por habitación o código..."
          value={searchText}
          onChangeText={setSearchText}
          style={{ flex: 1 }}
        />
      </View>
      <FilterTabs
        tabs={[
          { key: "all", label: "Todos", count: servicios.length },
          { key: "pendiente", label: "En Proceso", count: pendientes.length },
          { key: "finalizado", label: "Finalizados", count: finalizados.length },
          { key: "anulado", label: "Anulados", count: anulados.length },
        ]}
        activeKey={filter}
        onTabPress={setFilter}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      {error ? (
        <ErrorState
          variant="inline"
          icon="warning-outline"
          title="No se pudieron cargar los servicios"
          message={error}
          onRetry={() => fetchData(true)}
        />
      ) : null}

      <VirtualizedList
        data={filteredData}
        keyExtractor={(item: Servicio) => String(item.id_servicio)}
        renderItem={renderServicio}
        estimatedItemSize={150}
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
          <EmptyState
            icon="bed-outline"
            title="No hay servicios"
            actionLabel={searchText ? undefined : "Actualizar"}
            onAction={searchText ? undefined : onRefresh}
          />
        }
      />

      <ServiceDetailModal
        visible={modalVisible}
        servicio={selectedServicio}
        onClose={() => setModalVisible(false)}
      />

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        showCancel={alertConfig.showCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: {
    margin: 16,
    padding: 24,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.black,
    marginBottom: 12,
    letterSpacing: -1,
  },
  summaryDetails: { flexDirection: "row", gap: 12 },
  summaryDetail: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: tabBarBottomPadding },
});
