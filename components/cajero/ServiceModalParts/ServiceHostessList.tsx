import { Text, View } from "react-native";

interface ServiceHostessListProps {
  service: any;
  allHostesses: any[];
  isTablet: boolean;
  accentBg: string;
  accentBorder: string;
  textPrimary: string;
  textSecondary: string;
}

export function ServiceHostessList({
  service,
  allHostesses,
  isTablet,
  accentBg,
  accentBorder,
  textPrimary,
  textSecondary,
}: ServiceHostessListProps) {
  const anfsIds = Array.isArray(service.anfitrionas_ids)
    ? service.anfitrionas_ids
    : [];
  const numAnfs = anfsIds.length || 1;
  const comisionIndividual =
    (service.comision_anfitriona || 0) > 0
      ? Math.floor(service.comision_anfitriona / numAnfs)
      : Math.floor(service.precio_servicio || 0);

  const displayAnfs =
    Array.isArray(service.anfitrionas_con_nicks) &&
    service.anfitrionas_con_nicks.length > 0
      ? service.anfitrionas_con_nicks
      : anfsIds.map((id: any) => {
          const found = allHostesses.find(
            (h) => String(h.id_usuario || h.id) === String(id),
          );
          return found
            ? found
            : {
                id,
                nick: `ID: ${id}`,
                nombre: "Anfitriona",
                apellido: "",
              };
        });

  return (
    <View style={{ marginLeft: 8, marginBottom: 16 }}>
      {displayAnfs.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: isTablet ? 12 : 8,
          }}
        >
          {displayAnfs.map((anf: any, idx: number) => (
            <View
              key={idx}
              style={{
                backgroundColor: accentBg,
                paddingHorizontal: isTablet ? 16 : 12,
                paddingVertical: isTablet ? 12 : 8,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: accentBorder,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={{
                    color: textPrimary,
                    fontSize: isTablet ? 16 : 13,
                    fontWeight: "800",
                  }}
                >
                  {anf.nick || anf.nombre}
                </Text>
                <Text
                  style={{
                    color: "#10B981",
                    fontSize: isTablet ? 15 : 12,
                    fontWeight: "900",
                  }}
                >
                  + ${comisionIndividual.toLocaleString("de-DE")}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text
          style={{
            color: textSecondary,
            fontSize: isTablet ? 16 : 13,
            fontStyle: "italic",
          }}
        >
          No hay información de anfitrionas
        </Text>
      )}
    </View>
  );
}
