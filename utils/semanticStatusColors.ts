import { ensureContrast } from '@/utils/color';

export type SemanticStatusTone = 'pending' | 'success' | 'error' | 'info' | 'neutral';

type SemanticColors = {
  error: string;
  errorSurface: string;
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  info: string;
  infoSurface: string;
};

const semanticTokens = {
  pending: { foreground: 'warning', background: 'warningSurface' },
  success: { foreground: 'success', background: 'successSurface' },
  error: { foreground: 'error', background: 'errorSurface' },
  info: { foreground: 'info', background: 'infoSurface' },
} as const satisfies Record<Exclude<SemanticStatusTone, 'neutral'>, {
  foreground: keyof SemanticColors;
  background: keyof SemanticColors;
}>;

export function getAdvanceStatusTone(status: string): SemanticStatusTone {
  if (status === 'pendiente') return 'pending';
  if (status === 'rechazada' || status === 'rechazado') return 'error';
  if (['pagada', 'pagado', 'confirmada', 'confirmado', 'aprobada', 'aprobado', 'liquidada', 'liquidado'].includes(status)) {
    return 'success';
  }
  return 'neutral';
}

export function resolveSemanticStatusColors(
  tone: SemanticStatusTone,
  semantic: SemanticColors,
  neutralSurface: string,
  neutralText: string,
) {
  if (tone === 'neutral') {
    return { backgroundColor: neutralSurface, textColor: neutralText };
  }

  const { foreground, background } = semanticTokens[tone];
  const backgroundColor = semantic[background];
  return {
    backgroundColor,
    textColor: ensureContrast(semantic[foreground], backgroundColor, 4.5),
  };
}