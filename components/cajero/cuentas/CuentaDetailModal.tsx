import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { BASE_URL } from "@/api/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCuentasScreen } from "@/hooks/useCuentasScreen";
import { parseDateSafe } from "@/utils/timeUtils";

const statusColors: Record<number, string> = {
  0: "#10B981",
  1: "#fa2828ff",
  2: "#F59E0B",
  3: "#6B7280",
  4: "#FB923C",
};

const statusLabels: Record<number, string> = {
  0: "Cobrado",
  1: "Pendiente",
  2: "Solicitud Anul.",
  3: "Anulado",
  4: "Anul. Parcial",
};

type Screen = ReturnType<typeof useCuentasScreen>;

type Props = {
  screen: Screen;
  styles: Record<string, any>;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
};

const renderDetailSkeleton = () => (
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

export function CuentaDetailModal({
  screen,
  styles,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
}: Props) {
  const { selectedCuenta, loadingDetail, modalVisible } = screen;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => screen.setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor }]}>
          {loadingDetail ? (
            renderDetailSkeleton()
          ) : (
            selectedCuenta && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalle de Cuenta</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: statusColors[Number(selectedCuenta.estado)] || "#6B7280",
                        }}
                      />
                      <Text style={[styles.modalSubText, { color: textSecondary, fontWeight: "800" }]}>
                        {statusLabels[Number(selectedCuenta.estado)] || "Desconocido"} • #{selectedCuenta.codigo}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => screen.setModalVisible(false)} style={{ padding: 8 }}>
                    <Ionicons name="close-circle" size={32} color={textSecondary} />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                  <View style={[styles.infoGrid, { marginTop: 10 }]}>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridLabel, { color: textSecondary }]}>CLIENTE</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <Ionicons name="person" size={16} color={accentColor} />
                        <Text style={[styles.gridValue, { color: textPrimary, fontSize: 15, fontWeight: "800" }]}>
                          {selectedCuenta.cliente_nombre || "Sin registrar"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.gridItem}>
                      <Text style={[styles.gridLabel, { color: textSecondary }]}>FECHA Y HORA</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <Ionicons name="calendar" size={16} color={accentColor} />
                        <Text style={[styles.gridValue, { color: textPrimary, fontWeight: "700" }]}>
                          {selectedCuenta.fecha_crea ? (() => {
                            const d = parseDateSafe(selectedCuenta.fecha_crea);
                            return d.toLocaleString("es-ES", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            }).replace(/,/g, "");
                          })() : "-"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.gridItem}>
                      <Text style={[styles.gridLabel, { color: textSecondary }]}>HABITACIÓN / SECTOR</Text>
                      <Text style={[styles.gridValue, { color: textPrimary }]}>
                        {selectedCuenta.habitacion_numero || "Barra / General"}
                      </Text>
                    </View>

                    <View style={styles.gridItem}>
                      <Text style={[styles.gridLabel, { color: textSecondary }]}>REGISTRADO POR</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        {selectedCuenta.foto_cajero ? (
                          <Image
                            source={{ uri: `${BASE_URL}/img/users/${selectedCuenta.foto_cajero}` }}
                            style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#E5E7EB" }}
                          />
                        ) : (
                          <Ionicons name="person-circle" size={24} color={textSecondary} />
                        )}
                        <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedCuenta.nombre_cajero || "Sistema"}</Text>
                      </View>
                    </View>

                    {selectedCuenta.nombre_cobrador && (
                      <View style={styles.gridItem}>
                        <Text style={[styles.gridLabel, { color: "#10B981" }]}>COBRADO POR</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                          {selectedCuenta.foto_cobrador ? (
                            <Image
                              source={{ uri: `${BASE_URL}/img/users/${selectedCuenta.foto_cobrador}` }}
                              style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#E5E7EB", borderWidth: 1, borderColor: "#10B981" }}
                            />
                          ) : (
                            <Ionicons name="person-circle" size={24} color="#10B981" />
                          )}
                          <Text style={[styles.gridValue, { color: "#10B981", fontWeight: "800" }]}>{selectedCuenta.nombre_cobrador}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {(() => {
                    const roomHistory = Array.isArray(selectedCuenta.habitaciones_historial_data)
                      ? selectedCuenta.habitaciones_historial_data
                      : [];
                    const totalRoomTime = Number(selectedCuenta.tiempo_total ?? selectedCuenta.tiempo ?? 0);
                    const activeRoomTime = Number(selectedCuenta.tiempo_activo ?? 0);

                    if (totalRoomTime <= 0 && roomHistory.length === 0) return null;

                    return (
                      <View style={{ marginTop: 22, paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: "900", color: textSecondary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1.5 }}>
                          Historial de Habitacion
                        </Text>
                        <View style={{
                          backgroundColor: isDark ? "#171717" : "#F8FAFC",
                          borderRadius: 22,
                          padding: 16,
                          borderWidth: 1,
                          borderColor,
                          marginBottom: 14,
                        }}>
                          <Text style={[styles.gridLabel, { color: textSecondary }]}>TIEMPO TOTAL REGISTRADO</Text>
                          <Text style={[styles.gridValue, { color: textPrimary, fontWeight: "900", marginTop: 4 }]}>{totalRoomTime} min</Text>
                          {activeRoomTime > 0 && (
                            <Text style={{ color: accentColor, fontSize: 12, fontWeight: "700", marginTop: 4 }}>
                              Timer activo: {activeRoomTime} min
                            </Text>
                          )}
                        </View>

                        {roomHistory.length > 0 && (
                          <View style={{ gap: 10 }}>
                            {roomHistory.map((entry: any, index: number) => {
                              const assignedMinutes = Number(entry.assignedMinutes || 0);
                              const consumedMinutes = Number(entry.consumedMinutes || 0);
                              const remainingMinutes = Math.max(0, Number(entry.remainingMinutes ?? assignedMinutes - consumedMinutes));

                              return (
                                <View
                                  key={`${entry.roomId || "room"}-${entry.startedAt || index}-${index}`}
                                  style={{
                                    backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                                    borderRadius: 20,
                                    padding: 14,
                                    borderWidth: 1,
                                    borderColor,
                                  }}
                                >
                                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <Text style={{ color: textPrimary, fontWeight: "900", fontSize: 14 }}>
                                      {entry.roomName || "Habitacion"}
                                    </Text>
                                    <Text style={{ color: entry.isActive ? accentColor : textSecondary, fontWeight: "800", fontSize: 12 }}>
                                      {entry.isActive ? "Activo" : "Finalizado"}
                                    </Text>
                                  </View>
                                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                                    <View style={{ flex: 1, backgroundColor: isDark ? "#262626" : "#F8FAFC", borderRadius: 14, padding: 10 }}>
                                      <Text style={{ color: textSecondary, fontSize: 10, fontWeight: "900" }}>ASIGNADO</Text>
                                      <Text style={{ color: textPrimary, fontSize: 15, fontWeight: "900", marginTop: 4 }}>{assignedMinutes} min</Text>
                                    </View>
                                    <View style={{ flex: 1, backgroundColor: isDark ? "#2A2114" : "#FFF7ED", borderRadius: 14, padding: 10 }}>
                                      <Text style={{ color: isDark ? "#FBBF24" : "#C2410C", fontSize: 10, fontWeight: "900" }}>CONSUMIDO</Text>
                                      <Text style={{ color: isDark ? "#FBBF24" : "#C2410C", fontSize: 15, fontWeight: "900", marginTop: 4 }}>{consumedMinutes} min</Text>
                                    </View>
                                    <View style={{ flex: 1, backgroundColor: isDark ? "#13261D" : "#ECFDF5", borderRadius: 14, padding: 10 }}>
                                      <Text style={{ color: "#10B981", fontSize: 10, fontWeight: "900" }}>RESTANTE</Text>
                                      <Text style={{ color: "#10B981", fontSize: 15, fontWeight: "900", marginTop: 4 }}>{remainingMinutes} min</Text>
                                    </View>
                                  </View>
                                  <Text style={{ color: textSecondary, fontSize: 12 }}>
                                    Inicio: {entry.startedAt ? parseDateSafe(entry.startedAt).toLocaleString("es-ES", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    }).replace(/,/g, "") : "-"}
                                  </Text>
                                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                                    Fin: {entry.endedAt ? parseDateSafe(entry.endedAt).toLocaleString("es-ES", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    }).replace(/,/g, "") : "En curso"}
                                  </Text>
                                  {entry.carriedFromPrevious && (
                                    <Text style={{ color: accentColor, fontSize: 12, fontWeight: "700", marginTop: 6 }}>
                                      Tiempo agregado tras cambio de habitacion
                                    </Text>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {(() => {
                    const resumen = selectedCuenta.resumen_financiero || {};
                    const solicitudes = Array.isArray(selectedCuenta.solicitudes_anulacion)
                      ? selectedCuenta.solicitudes_anulacion
                      : [];
                    const totalOriginal = Number(resumen.total_original ?? selectedCuenta.total ?? 0);
                    const totalActual = Number(resumen.total_actual ?? selectedCuenta.total ?? 0);
                    const totalAnulado = Number(resumen.total_anulado_aprobado ?? 0);
                    const totalPendiente = Number(resumen.total_anulacion_pendiente ?? 0);

                    return (
                      <View style={{ marginTop: 22, paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: "900", color: textSecondary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1.5 }}>
                          Resumen financiero
                        </Text>
                        <View style={{ gap: 10 }}>
                          <View style={{ flexDirection: "row", gap: 10 }}>
                            <View style={{ flex: 1, backgroundColor: isDark ? "#1A1A1A" : "#F8FAFC", borderRadius: 20, padding: 14, borderWidth: 1, borderColor }}>
                              <Text style={{ color: textSecondary, fontSize: 11, fontWeight: "900" }}>TOTAL ORIGINAL</Text>
                              <Text style={{ color: textPrimary, fontSize: 20, fontWeight: "900", marginTop: 6 }}>${totalOriginal.toLocaleString("es-CL")}</Text>
                            </View>

                            <View style={{ flex: 1, backgroundColor: isDark ? "#221417" : "#FFF1F2", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: isDark ? "#3F1D24" : "#FECDD3" }}>
                              <Text style={{ color: "#E11D48", fontSize: 11, fontWeight: "900" }}>ANULADO APROBADO</Text>
                              <Text style={{ color: "#E11D48", fontSize: 20, fontWeight: "900", marginTop: 6 }}>${totalAnulado.toLocaleString("es-CL")}</Text>
                              {totalPendiente > 0 && (
                                <Text style={{ color: isDark ? "#FBBF24" : "#B45309", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                                  Pendiente: ${totalPendiente.toLocaleString("es-CL")}
                                </Text>
                              )}
                            </View>
                          </View>

                          <View style={{ backgroundColor: isDark ? "#13261D" : "#ECFDF5", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: isDark ? "#1F5139" : "#A7F3D0" }}>
                            <Text style={{ color: "#10B981", fontSize: 11, fontWeight: "900" }}>TOTAL ACTUAL A COBRAR</Text>
                            <Text style={{ color: "#10B981", fontSize: 24, fontWeight: "900", marginTop: 6 }}>${totalActual.toLocaleString("es-CL")}</Text>
                          </View>
                        </View>

                        {solicitudes.length > 0 && (
                          <View style={{ marginTop: 14, gap: 10 }}>
                            <Text style={{ fontSize: 13, fontWeight: "900", color: textSecondary }}>Historial de anulacion</Text>
                            {solicitudes.map((sol: any, index: number) => {
                              const estado = String(sol.estado || "").toLowerCase();
                              const chipBg =
                                estado === "aprobado"
                                  ? (isDark ? "#13261D" : "#ECFDF5")
                                  : estado === "rechazado"
                                    ? (isDark ? "#221417" : "#FFF1F2")
                                    : (isDark ? "#2A2114" : "#FFF7ED");
                              const chipColor =
                                estado === "aprobado"
                                  ? "#10B981"
                                  : estado === "rechazado"
                                    ? "#E11D48"
                                    : "#D97706";

                              return (
                                <View
                                  key={sol.id || index}
                                  style={{
                                    backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                                    borderRadius: 20,
                                    padding: 14,
                                    borderWidth: 1,
                                    borderColor,
                                  }}
                                >
                                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <Text style={{ color: textPrimary, fontWeight: "900", fontSize: 16 }}>
                                      ${Number(sol.monto || 0).toLocaleString("es-CL")}
                                    </Text>
                                    <View style={{ backgroundColor: chipBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                                      <Text style={{ color: chipColor, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>
                                        {estado || "pendiente"}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={{ color: textSecondary, fontSize: 12 }}>
                                    Solicitada: {sol.fecha_crea ? parseDateSafe(sol.fecha_crea).toLocaleString("es-ES", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    }).replace(/,/g, "") : "-"}
                                  </Text>
                                  {!!sol.fecha_mod && estado !== "pendiente" && (
                                    <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                                      Resuelta: {parseDateSafe(sol.fecha_mod).toLocaleString("es-ES", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true,
                                      }).replace(/,/g, "")}
                                    </Text>
                                  )}
                                  {!!sol.motivo && (
                                    <Text style={{ color: textPrimary, fontSize: 13, marginTop: 8, lineHeight: 18 }}>
                                      {sol.motivo}
                                    </Text>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  <View style={{ marginTop: 25, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: textSecondary, marginBottom: 15, textTransform: "uppercase", letterSpacing: 1.5 }}>
                      Detalle de Consumo
                    </Text>
                    {(() => {
                      const details = selectedCuenta.detalles || [];
                      const grouped = details.reduce((acc: any[], current: any) => {
                        const key = `${current.producto}-${current.hostess_nick || "SIN ANFITRIONA"}-${current.added_by || "S"}`;
                        const existingIndex = acc.findIndex((item) => item.groupKey === key);
                        if (existingIndex > -1) {
                          acc[existingIndex].cantidad += current.cantidad;
                          acc[existingIndex].sub_total += current.sub_total;
                          acc[existingIndex].comision += current.comision || 0;
                        } else {
                          acc.push({ ...current, groupKey: key });
                        }
                        return acc;
                      }, []);

                      if (grouped.length === 0) {
                        return (
                          <View style={{ padding: 40, alignItems: "center", backgroundColor: isDark ? "#111" : "#F5F5F5", borderRadius: 24, borderStyle: "dashed", borderWidth: 1, borderColor }}>
                            <Ionicons name="cart-outline" size={32} color={textSecondary} />
                            <Text style={{ color: textSecondary, fontWeight: "700", marginTop: 10 }}>Sin consumos</Text>
                          </View>
                        );
                      }

                      return (
                        <View style={{ gap: 14 }}>
                          {grouped.map((det: any, index: number) => (
                            <View
                              key={index}
                              style={{
                                backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                                borderRadius: 24,
                                padding: 18,
                                borderWidth: 1,
                                borderColor,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: isDark ? 0.4 : 0.08,
                                shadowRadius: 12,
                                elevation: 4,
                              }}
                            >
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <View style={{ backgroundColor: accentColor + "15", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: accentColor + "20" }}>
                                  <Text style={{ fontSize: 13, fontWeight: "900", color: accentColor }}>CANT: {det.cantidad}</Text>
                                </View>
                                {det.added_by && (
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "#262626" : "#F3F4F6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 }}>
                                    {det.added_by_foto ? (
                                      <Image source={{ uri: `${BASE_URL}/img/users/${det.added_by_foto}` }} style={{ width: 22, height: 22, borderRadius: 11 }} />
                                    ) : (
                                      <Ionicons name="person-circle" size={18} color={accentColor} />
                                    )}
                                    <Text style={{ fontSize: 12, color: textPrimary, fontWeight: "800" }}>Vía: {det.added_by}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      );
                    })()}
                  </View>

                  <Pressable
                    style={[styles.modalCloseBtn, { backgroundColor: accentColor, marginTop: 20 }]}
                    onPress={() => screen.setModalVisible(false)}
                  >
                    <Text style={styles.modalCloseBtnText}>Cerrar Detalles</Text>
                  </Pressable>
                </ScrollView>
              </>
            )
          )}
        </View>
      </View>
    </Modal>
  );
}
