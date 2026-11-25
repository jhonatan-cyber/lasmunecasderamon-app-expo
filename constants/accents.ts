import { DEFAULT_PROFILE_ACCENT } from '@/constants/colorTokens';

export interface ThemeOption {
  name: string;
  /** Color plano del acento: la paleta es neón, sin degradado. */
  color: string;
}

/**
 * Paleta de acentos en versión **neón brillante**: colores saturados y
 * luminosos, pensados para brillar sobre el fondo negro en modo oscuro.
 *
 * Vive en `constants/` (y no en el store) para que la generación de paletas
 * pueda leerla sin crear un ciclo de imports con `store/themeStore.ts`.
 *
 * Cada color es plano. El brillo no viene de un degradado sino del halo
 * (`accentGlow`) que se aplica a las superficies de marca.
 *
 * Dorado (`#FFE600`) se fusionó con Ámbar y Pizarra (`#6E8CB8`) con Plata:
 * sus paletas quedaban a ΔE2000 < 9 entre sí, indistinguibles en pantalla.
 * Los colores retirados siguen en `LEGACY_ACCENT_MAP` para migrar lo guardado.
 */
export const THEME_OPTIONS: ThemeOption[] = [
  { name: 'Rojo (Default)', color: DEFAULT_PROFILE_ACCENT },
  { name: 'Violeta', color: '#C13BFF' },
  { name: 'Azul', color: '#0095FF' },
  { name: 'Índigo', color: '#6C4DFF' },
  { name: 'Esmeralda', color: '#00FFA6' },
  { name: 'Naranja', color: '#FF8A00' },
  { name: 'Rosa', color: '#FF2E9A' },
  { name: 'Cian', color: '#00F5FF' },
  { name: 'Ámbar', color: '#FFC400' },
  { name: 'Plata', color: '#DCE9F7' },
  { name: 'Negro', color: '#171717' },
];

export const BLACK_ACCENT = '#171717';
