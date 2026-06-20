import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";

interface Participant {
  nombre: string;
  nick?: string;
  monto: number;
  estado: number;
}

interface TipParticipantsProps {
  participants: Participant[];
}

export const TipParticipants: React.FC<TipParticipantsProps> = ({
  participants,
}) => {
  const { accentColor, isDark } = useAccentColor();
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? `${accentColor}40` : "rgba(0,0,0,0.05)";

  return (
    <>
      <Text style={[styles.sectionTitle, { color: textSecondary, marginTop: 20 }]}>
        REPARTICIÓN
      </Text>
      <View style={[styles.list, { borderColor }]}>
        {participants.map((p, idx) => (
          <View
            key={idx}
            style={[
              styles.row,
              {
                borderBottomColor: borderColor,
                borderBottomWidth:
                  idx === participants.length - 1 ? 0 : 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: textPrimary }]}>
                {p.nombre}
              </Text>
              {p.nick ? (
                <Text style={{ color: textSecondary, fontSize: 12 }}>
                  @{p.nick}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.monto, { color: accentColor }]}>
                ${(p.monto || 0).toLocaleString()}
              </Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      p.estado === 1
                        ? isDark
                          ? "rgba(16,185,129,0.2)"
                          : "#D1FAE5"
                        : isDark
                          ? "rgba(59,130,246,0.2)"
                          : "#DBEAFE",
                    marginTop: 4,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color:
                      p.estado === 1
                        ? isDark
                          ? "#10B981"
                          : "#065F46"
                        : isDark
                          ? "#3B82F6"
                          : "#1E40AF",
                  }}
                >
                  {p.estado === 1 ? "Por cobrar" : "Cobrada"}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  list: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  name: { fontSize: 14, fontWeight: "700" },
  monto: { fontSize: 14, fontWeight: "800" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
});
