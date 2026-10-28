import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { BAUCHER_FOTO_MAX_CHARS } from "@lasmunecasderamon/validations";

/**
 * Ajuste de la foto del baucher a la cámara.
 *
 * `launchCameraAsync` sólo acepta `quality`, y en algunos dispositivos eso no
 * alcanza: el base64 viaja dentro del payload del pedido y el dashboard rechaza
 * con 400 cualquier `baucher_foto` sobre `BAUCHER_FOTO_MAX_CHARS`. Sin este
 * ajuste, una foto gigante deja el pedido sin enviar y volver a sacarla repite
 * el mismo tamaño.
 *
 * La estrategia es reducir el lado largo a `ANCHO_OBJETIVO` y comprimir hasta
 * que la foto entre en el límite. Si ninguna calidad llega (o la imagen no se
 * puede manipular), devuelve `null` y el llamador decide: nunca entrega una foto
 * que el servidor va a rechazar.
 */

/** Ancho con el que se rehace la foto: el baucher se lee igual y ya no pesa. */
const ANCHO_OBJETIVO = 1600;

/** Primero se intenta conservando nitidez; sólo se degrada si sigue sin caber. */
const CALIDADES = [0.6, 0.4, 0.25] as const;

export type ResultadoAjusteBaucher =
  | { ok: true; dataUrl: string }
  | { ok: false; motivo: "no-cabe" | "no-se-pudo" };

/**
 * Devuelve la foto como data URL dentro del límite del servidor.
 *
 * @param dataUrl foto tal cual salió de la cámara.
 * @param uri archivo temporal del picker, si existe: se manipula desde él porque
 * `manipulate` sabe leerlo igual que el data URL.
 */
export async function ajustarFotoBaucher(
  dataUrl: string,
  uri?: string | null,
): Promise<ResultadoAjusteBaucher> {
  if (dataUrl.length <= BAUCHER_FOTO_MAX_CHARS) return { ok: true, dataUrl };

  const fuente = uri || dataUrl;
  let falloDeManipulacion = false;

  for (const compress of CALIDADES) {
    try {
      const referencia = await ImageManipulator.manipulate(fuente)
        .resize({ width: ANCHO_OBJETIVO })
        .renderAsync();
      const guardada = await referencia.saveAsync({
        compress,
        base64: true,
        format: SaveFormat.JPEG,
      });
      if (!guardada.base64) {
        falloDeManipulacion = true;
        continue;
      }
      const ajustada = `data:image/jpeg;base64,${guardada.base64}`;
      if (ajustada.length <= BAUCHER_FOTO_MAX_CHARS) return { ok: true, dataUrl: ajustada };
    } catch {
      // Una calidad falló: se prueba con la siguiente antes de rendirse.
      falloDeManipulacion = true;
    }
  }

  return { ok: false, motivo: falloDeManipulacion ? "no-se-pudo" : "no-cabe" };
}
