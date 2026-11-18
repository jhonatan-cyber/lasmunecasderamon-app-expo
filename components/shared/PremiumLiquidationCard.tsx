import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { useAccentColor } from "@/hooks/useAccentColor";
import { formatCurrency } from "@/utils/format";
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Print from "expo-print";
import { useCallback,useMemo,useState } from "react";
import { PermissionsAndroid,Platform,Pressable,StyleSheet,Text,View } from "react-native";

import logger from "@/utils/logger";
interface Event {
  type: string;
  id: number;
  codigo: string;
  date: string;
  amount: number;
  estado: number;
}

interface User {
  name?: string;
  lastName?: string;
  nick?: string;
}

interface PremiumLiquidationCardProps {
  user: User | null;
  events: Event[];
  title?: string;
  subtitle?: string;
  totalLabel?: string;
  totalAmount?: number;
  onExportSuccess?: () => void;
}

export function PremiumLiquidationCard({
  user,
  events,
  title = "Total a cobrar",
  subtitle = "Resumen de Actividad",
  totalLabel = "Total a cobrar",
  totalAmount,
  onExportSuccess,
}: PremiumLiquidationCardProps) {
  const {accentColor, accentText, cardBg, textSecondary, borderColor} = useAccentColor();
  const [exporting, setExporting] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "danger" | "warning" | "info";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (
    title: string,
    message: string,
    type: "success" | "danger" | "warning" | "info" = "success",
  ) => {
    setAlertConfig({ visible: true, title, message, type });
  };



  const totalCalculated = useMemo(() => {
    return events.reduce((sum, eventItem) => {
      if (eventItem.estado !== undefined && eventItem.estado !== 1) return sum;
      const amount = Number(eventItem.amount) || 0;
      if (eventItem.type === "anticipo") return sum - amount;
      return sum + amount;
    }, 0);
  }, [events]);

  const totalDisplayed = useMemo(() => {
    if (typeof totalAmount === "number" && !Number.isNaN(totalAmount)) {
      return totalAmount;
    }
    return totalCalculated;
  }, [totalAmount, totalCalculated]);

  const handleExportReport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      if (Platform.OS === "android" && Number(Platform.Version) < 29) {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          showAlert("Permiso requerido", "Se necesita permiso de almacenamiento para guardar el PDF en Descargas.", "warning");
          return;
        }
      }

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111111; }
              .header { text-align: center; border-bottom: 2px solid ${accentColor}; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 28px; font-weight: 900; color: ${accentColor}; margin-bottom: 5px; }
              .subtitle { font-size: 14px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
              .info-box { background: #F9FAFB; padding: 16px; border-radius: 12px; }
              .info-label { font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
              .info-value { font-size: 16px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
              th { text-align: left; background: ${accentColor}; color: white; padding: 12px; font-size: 12px; }
              td { padding: 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; }
              .total-row { background: #F3F4F6; }
              .total-label { font-weight: bold; text-align: right; }
              .total-value { font-weight: 900; color: #10B981; }
              .footer { text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 50px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">Las Munecas de Ramon</div>
              <div class="subtitle">${title}</div>
            </div>
            <div class="info-grid">
              <div class="info-box">
                <div class="info-label">USUARIO</div>
                <div class="info-value">${user?.name || ""} ${user?.lastName || ""} ${user?.nick ? `- ${user.nick}` : ""}</div>
              </div>
              <div class="info-box">
                <div class="info-label">FECHA DE REPORTE</div>
                <div class="info-value">${new Date().toLocaleString()}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>FECHA Y HORA</th>
                  <th>TIPO</th>
                  <th>CODIGO</th>
                  <th style="text-align: right;">MONTO</th>
                </tr>
              </thead>
              <tbody>
                ${events
                  .map((eventItem) => {
                    let typeLabel = eventItem.type.toUpperCase();
                    if (eventItem.type === "comision")
                      typeLabel = "COMISION DE VENTA";
                    if (eventItem.type === "venta")
                      typeLabel = "VENTA DE PRODUCTO";

                    return `
                      <tr>
                        <td>${new Date(eventItem.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</td>
                        <td>${typeLabel}</td>
                        <td>${eventItem.codigo}</td>
                        <td style="text-align: right;">$${(eventItem.amount || 0).toLocaleString()}</td>
                      </tr>
                    `;
                  })
                  .join("")}
                <tr class="total-row">
                  <td colspan="3" class="total-label">${totalLabel.toUpperCase()}</td>
                  <td class="total-value" style="text-align: right;">$${totalDisplayed.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            <div class="footer">
              Este es un documento informativo generado automaticamente.<br/>
              &copy; ${new Date().getFullYear()} Las Munecas de Ramon - Sistema de Gestion
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (Platform.OS === "android") {
        const { default: BlobUtil } = await import("react-native-blob-util");
        const fileName = `reporte_${Date.now()}.pdf`;
        const destination = await BlobUtil.media.createFile(
          { name: fileName, parentFolder: "", mimeType: "application/pdf" },
          "Download",
        );
        try {
          await BlobUtil.media.write(destination, uri);
        } catch (error) {
          try {
            await BlobUtil.fs.unlink(destination);
          } catch (cleanupError) {
            logger.captureException(cleanupError, {
              context: "PremiumLiquidationCard:cleanupReport",
            });
          }
          throw error;
        }
        showAlert(
          "Descarga completada",
          `El reporte se guardó en Descargas como ${fileName}.`,
          "success",
        );
      } else if (Platform.OS === "ios") {
        await Print.printAsync({ html });
      }

      onExportSuccess?.();
    } catch (error) {
      logger.captureException(error, {
        context: "PremiumLiquidationCard:fetchLiquidacion",
      });
      const message = error instanceof Error ? error.message : String(error ?? "");
      if (/native module|TurboModuleRegistry|not registered/i.test(message)) {
        showAlert(
          "Falta actualizar la app",
          "La versión instalada no incluye el guardado en Descargas. Instala la última compilación de la app; recargar solo el JS no basta.",
          "warning",
        );
      } else {
        showAlert(
          "Error",
          "No se pudo generar o guardar el reporte PDF. Intenta nuevamente.",
          "danger",
        );
      }
    } finally {
      setExporting(false);
    }
  }, [
    accentColor,
    events,
    exporting,
    onExportSuccess,
    title,
    totalDisplayed,
    totalLabel,
    user,
  ]);

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.summaryBlock}>
          <View style={styles.labelRow}>
            <Ionicons name="wallet-outline" size={13} color={textSecondary} />
            <Text style={[styles.label, { color: textSecondary }]}>
              {totalLabel}
            </Text>
          </View>
          <Text
            style={[styles.value, { color: accentColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(totalDisplayed)}
          </Text>
        </View>
        <Pressable
          onPress={handleExportReport}
          disabled={exporting}
          accessibilityLabel="Exportar reporte a PDF"
          accessibilityRole="button"
          accessibilityState={{ busy: exporting, disabled: exporting }}
          style={({ pressed }) => [
            styles.exportBtn,
            {
              backgroundColor: accentColor,
              opacity: exporting ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="document-text-outline" size={18} color={accentText} />
          <Text style={[styles.exportBtnText, { color: accentText }]}>
            {exporting ? "Guardando…" : "Descargar PDF"}
          </Text>
        </Pressable>
      </View>

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={() =>
          setAlertConfig((prev) => ({ ...prev, visible: false }))
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryBlock: {
    flex: 1,
    gap: 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  exportBtn: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minWidth: 118,
  },
  exportBtnText: {
    fontWeight: "800",
    fontSize: 12,
  },
});
