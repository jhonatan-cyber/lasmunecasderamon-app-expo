import type { useCuentasScreen } from "@/hooks/useCuentasScreen";

import { CuentaAnulacionModal } from "@/components/cajero/cuentas/CuentaAnulacionModal";
import { CuentaActionSheet } from "@/components/cajero/cuentas/CuentaActionSheet";
import { CuentaCobroModal } from "@/components/cajero/cuentas/CuentaCobroModal";
import { CuentaDetailModal } from "@/components/cajero/cuentas/CuentaDetailModal";
import { PremiumAlert } from "@/components/ui/PremiumAlert";

type CuentasScreenState = ReturnType<typeof useCuentasScreen>;

type Props = {
  screen: CuentasScreenState;
  styles: Record<string, any>;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
};

export function CuentasOverlays({
  screen,
  styles,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
}: Props) {
  const { alertConfig } = screen;

  return (
    <>
      <CuentaDetailModal
        screen={screen}
        styles={styles}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
      />

      <CuentaCobroModal
        screen={screen}
        styles={styles}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
      />

      <CuentaActionSheet
        screen={screen}
        styles={styles}
        accentColor={accentColor}
        cardBg={cardBg}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
      />

      <CuentaAnulacionModal
        screen={screen}
        styles={styles}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
      />

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel || (() => screen.setAlertVisible(false))}
        showCancel={true}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />
    </>
  );
}
