import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { parseDateSafe } from '@/utils/timeUtils';

interface Props {
  selectedService: any;
  isTablet: boolean;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  styles: Record<string, any>;
}

export function ServiceInfoSection({ selectedService, isTablet, accentColor, textPrimary, textSecondary, styles }: Props) {
  const fechaServicio = parseDateSafe(selectedService.fecha_solicitud || selectedService.fecha_crea || selectedService.created_at || selectedService.startTime);
  const formattedDate = fechaServicio
    ? fechaServicio.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : '-';

  return (
    <View>
      <View style={[styles.infoRow, { marginBottom: 12 }]}>
        <Ionicons name="bed-outline" size={isTablet ? 24 : 20} color={accentColor} />
        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>
          Habitacion: {selectedService.habitacion_nombre || selectedService.habitacion_numero || 'Servicio de barra'}
        </Text>
      </View>
      <View style={[styles.infoRow, { marginBottom: 12 }]}>
        <Ionicons name="timer-outline" size={isTablet ? 24 : 20} color={accentColor} />
        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>
          Tiempo: {selectedService.tiempo || selectedService.time || 0} min
        </Text>
      </View>
      <View style={[styles.infoRow, { marginBottom: 12 }]}>
        <Ionicons name="person-outline" size={isTablet ? 24 : 20} color={accentColor} />
        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>
          Solicitado por: {selectedService.solicitado_por_nombre || selectedService.solicitante_name || 'Desconocido'}
        </Text>
      </View>
      <View style={[styles.infoRow, { marginBottom: 12 }]}>
        <Ionicons name="calendar-outline" size={isTablet ? 24 : 20} color={accentColor} />
        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>
          Fecha: {formattedDate}
        </Text>
      </View>
      <View style={[styles.infoRow, { marginBottom: 8 }]}>
        <Ionicons name="people-outline" size={isTablet ? 24 : 20} color={accentColor} />
        <Text style={[styles.infoText, { color: textPrimary, marginLeft: 8, fontSize: isTablet ? 18 : 14 }]}>
          Anfitrionas ({selectedService.anfitrionas_ids?.length || 0}):
        </Text>
      </View>
    </View>
  );
}

export function ServiceHostessesList({
  selectedService,
  allHostesses,
  isTablet,
  accentColor,
  accentBg,
  accentBorder,
  textPrimary,
  textSecondary,
}: {
  selectedService: any;
  allHostesses: any[];
  isTablet: boolean;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const anfsIds = Array.isArray(selectedService.anfitrionas_ids) ? selectedService.anfitrionas_ids : [];
  const numAnfs = anfsIds.length || 1;
  const comisionIndividual = (selectedService.comision_anfitriona || 0) > 0
    ? Math.floor(selectedService.comision_anfitriona / numAnfs)
    : Math.floor(selectedService.precio_servicio || 0);

  const displayAnfs = (Array.isArray(selectedService.anfitrionas_con_nicks) && selectedService.anfitrionas_con_nicks.length > 0)
    ? selectedService.anfitrionas_con_nicks
    : anfsIds.map((id: any) => {
        const found = allHostesses.find(h => String(h.id_usuario || h.id) === String(id));
        return found ? found : { id, nick: `ID: ${id}`, nombre: 'Anfitriona', apellido: '' };
      });

  return (
    <View style={{ marginLeft: 8, marginBottom: 16 }}>
      {displayAnfs.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isTablet ? 12 : 8 }}>
          {displayAnfs.map((anf: any, idx: number) => (
            <View key={idx} style={{
              backgroundColor: accentBg,
              paddingHorizontal: isTablet ? 16 : 12,
              paddingVertical: isTablet ? 12 : 8,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: accentBorder,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <View>
                <Text style={{ color: textPrimary, fontSize: isTablet ? 16 : 13, fontWeight: '800' }}>{anf.nick || anf.nombre}</Text>
                <Text style={{ color: '#10B981', fontSize: isTablet ? 15 : 12, fontWeight: '900' }}>+ ${comisionIndividual.toLocaleString('de-DE')}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ color: textSecondary, fontSize: isTablet ? 16 : 13, fontStyle: 'italic' }}>No hay información de anfitrionas</Text>
      )}
    </View>
  );
}
