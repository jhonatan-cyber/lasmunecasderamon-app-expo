import type { ApiRes } from "@/types/api";

export interface SolicitudAnulacionResultado {
  success: boolean;
  /** `true` cuando la solicitud quedó registrada pero el aviso por WhatsApp no se pudo enviar. */
  avisoFallido?: boolean;
  message?: string;
}

/**
 * Interpreta la respuesta del dashboard para una solicitud de anulación.
 *
 * El servidor registra la solicitud y después intenta avisar al administrador
 * por WhatsApp: si el aviso falla responde HTTP 202 con `success:false` y el
 * identificador de la solicitud (`token` en sales/cancellation, `id` en
 * accounts/cancellation). Un `success:false` sin identificador es un rechazo
 * real y no debe reportarse como éxito.
 *
 * No leer el identificador confunde "creada sin aviso" con "no se creó": la
 * solicitud existe y repetir el intento fallaría por duplicada.
 */
export function interpretarSolicitudAnulacion(
  res: ApiRes<unknown>,
): SolicitudAnulacionResultado {
  if (res.success) {
    return { success: true, message: res.message };
  }

  // La señal del sobre 202 no está modelada en ApiRes: mirarla de forma acotada.
  const extra = res as { token?: unknown; id?: unknown };
  if (extra.token != null || extra.id != null) {
    return {
      success: true,
      avisoFallido: true,
      message: res.message,
    };
  }

  return {
    success: false,
    message: res.message || res.error || "No se pudo solicitar la anulación",
  };
}
