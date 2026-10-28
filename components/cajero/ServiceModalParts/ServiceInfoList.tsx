import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import { parseDateSafe } from "@/utils/timeUtils";
import { styles } from "../ServiceModal.styles";

interface ServiceInfoListProps {
  service: any;
  isTablet: boolean;
  accentColor: string;
  textPrimary: string;
}

export function ServiceInfoList({
  service,
  isTablet,
  accentColor,
  textPrimary,
}: ServiceInfoListProps) {
  const fechaServicio = parseDateSafe(
    service.fecha_solicitud ||
      service.fecha_crea ||
      service.created_at ||
      service.startTime,
  );
  const iconSize = isTablet ? 24 : 20;
  const textStyle = [
    styles.infoText,
    { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 },
  ];

  return (
    <>
      <View style={[styles.optionsTitleContainer]}>
        <Text
          style={[
            styles.sectionTitle,
            { color: textPrimary, fontSize: isTablet ? 18 : 13 },
          ]}
        >
          Información
        </Text>
      </View>

      <View style={[styles.infoRow, { marginBottom: 12 }]}>
        <Ionicons name="bed-outline" size={iconSize} color={accentColor} />
        <Text style={textStyle}>
          {`Habitacion: ${
            service.habitacion_nombre ||
            service.habitacion_numero ||
            "Servicio de barra"
          }`}
        </Text>
      </View>
      <View style={[styles.infoRow, { marginBottom: 12 }]}>
        <Ionicons name="timer-outline" size={iconSize} color={accentColor} />
        <Text style={textStyle}>
          {`Tiempo: ${service.tiempo || service.time || 0} min`}
        </Text>
      </View>
      <View style={[styles.infoRow, { marginBottom: 12 }]}>
        <Ionicons name="person-outline" size={iconSize} color={accentColor} />
        <Text style={textStyle}>
          {`Solicitado por: ${
            service.solicitado_por_nombre ||
            service.solicitante_name ||
            "Desconocido"
          }`}
        </Text>
      </View>
      <View style={[styles.infoRow, { marginBottom: 12 }]}>
        <Ionicons name="calendar-outline" size={iconSize} color={accentColor} />
        <Text style={textStyle}>
          {`Fecha: ${
            fechaServicio
              ? fechaServicio.toLocaleString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "-"
          }`}
        </Text>
      </View>
      <View style={[styles.infoRow, { marginBottom: 8 }]}>
        <Ionicons name="people-outline" size={iconSize} color={accentColor} />
        <Text style={textStyle}>
          {`Anfitrionas (${service.anfitrionas_ids?.length || 0}):`}
        </Text>
      </View>
    </>
  );
}
