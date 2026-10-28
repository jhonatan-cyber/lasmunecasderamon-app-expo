/**
 * Detección de giro de cabeza para el enrolamiento facial.
 *
 * `expo-camera` ya no detecta rostros y expone-camera tampoco informa la
 * rotación de la cara, así que la medición la hace ML Kit
 * (`@infinitered/react-native-mlkit-face-detection`) sobre una foto de
 * comprobación. El módulo es nativo: si el APK instalado no lo incluye, la
 * carga falla y el enrolamiento vuelve a la captura temporizada de antes.
 */

export type FaseCaptura = 'front' | 'turn-left' | 'turn-right';

export interface MedicionGiro {
    /** Si el módulo nativo respondió. */
    disponible: boolean;
    /** Si se encontró una cara en la foto. */
    rostro: boolean;
    /** Rotación horizontal en grados; positivo mira a la derecha de la imagen. */
    yaw: number | null;
    /** La lectura falló (sin módulo, sin ángulo u error del detector). */
    fallo?: boolean;
}

/**
 * Para el paso frontal se exige mirar casi de frente. Para los perfiles se
 * exige un giro claro. El signo no se valida a propósito: el espejado de la
 * cámara frontal cambia según el equipo y bloquearía a quien ya giró.
 */
export const UMBRAL_FRONTAL = 12;
export const UMBRAL_PERFIL = 25;

/** Dónde se mira en cada paso, para no repetir la lista en la UI. */
export const LADOS: Record<FaseCaptura, string> = {
    front: 'frente',
    'turn-left': 'izquierda',
    'turn-right': 'derecha',
};

/** Si la medición cumple la pose que pide el paso. */
export function giroSuficiente(fase: FaseCaptura, yaw: number | null): boolean {
    if (yaw === null || !Number.isFinite(yaw)) return false;
    const valor = Math.abs(yaw);
    return fase === 'front' ? valor <= UMBRAL_FRONTAL : valor >= UMBRAL_PERFIL;
}

/**
 * Avance de la pose de 0 a 1, para el anillo de la pantalla: se llena a medida
 * que la persona se acerca a la posición pedida.
 */
export function progresoGiro(fase: FaseCaptura, yaw: number | null): number {
    if (yaw === null || !Number.isFinite(yaw)) return 0;
    const valor = Math.abs(yaw);
    if (fase === 'front') return Math.max(0, Math.min(1, 1 - valor / UMBRAL_FRONTAL));
    return Math.min(1, valor / UMBRAL_PERFIL);
}

interface DetectorFacial {
    initialize(options?: Record<string, unknown>): Promise<void>;
    detectFaces(uri: string): Promise<
        { success?: boolean; faces?: { headEulerAngleY?: number | null }[] } | undefined
    >;
}

const OPCIONES_DETECTOR = {
    performanceMode: 'fast',
    landmarkMode: false,
    contourMode: false,
    classificationMode: false,
    minFaceSize: 0.2,
    isTrackingEnabled: false,
} as const;

let detector: DetectorFacial | null = null;
let detectorCargado = false;
let inicializacion: Promise<boolean> | null = null;

function cargarDetector(): DetectorFacial | null {
    if (detectorCargado) return detector;
    detectorCargado = true;
    try {
        // Carga perezosa a propósito: un `import` estático ejecuta
        // `requireNativeModule` al cargar el bundle y rompe la app en un build
        // sin el módulo nativo. Así el enrolamiento cae a captura temporizada.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('@infinitered/react-native-mlkit-face-detection') as {
            RNMLKitFaceDetector: new (opciones?: Record<string, unknown>) => DetectorFacial;
        };
        detector = new mod.RNMLKitFaceDetector(OPCIONES_DETECTOR);
    } catch {
        detector = null;
    }
    return detector;
}

/** ¿Este build trae el detector nativo? Se resuelve una sola vez. */
export function detectorFacialDisponible(): boolean {
    return cargarDetector() !== null;
}

async function detectorListo(): Promise<DetectorFacial | null> {
    const actual = cargarDetector();
    if (!actual) return null;
    if (!inicializacion) {
        inicializacion = actual
            .initialize(OPCIONES_DETECTOR)
            .then(() => true)
            .catch(() => false);
    }
    const ok = await inicializacion;
    return ok ? actual : null;
}

/** Mide la rotación de la cara en una foto local (`file://…`). */
export async function medirGiroDesdeFoto(uri: string): Promise<MedicionGiro> {
    const listo = await detectorListo();
    if (!listo) return { disponible: false, rostro: false, yaw: null, fallo: true };

    try {
        const resultado = await listo.detectFaces(uri);
        if (!resultado || resultado.success === false) {
            return { disponible: true, rostro: false, yaw: null, fallo: true };
        }
        const cara = resultado.faces?.[0];
        if (!cara) return { disponible: true, rostro: false, yaw: null };
        const yaw = typeof cara.headEulerAngleY === 'number' ? cara.headEulerAngleY : null;
        return { disponible: true, rostro: true, yaw, fallo: yaw === null };
    } catch {
        return { disponible: true, rostro: false, yaw: null, fallo: true };
    }
}

/** Sólo para tests: vuelve a intentar la carga del módulo nativo. */
export function reiniciarDetectorParaPruebas(): void {
    detector = null;
    detectorCargado = false;
    inicializacion = null;
}
