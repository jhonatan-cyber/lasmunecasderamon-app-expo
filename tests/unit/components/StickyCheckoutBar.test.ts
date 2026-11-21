import { describe, expect, it, vi } from 'vitest';
import { resolveCheckoutCta } from '@/components/cajero/nueva-venta/StickyCheckoutBar';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));

describe('resolveCheckoutCta — el CTA dice qué falta', () => {
  it('cobra cuando la venta está lista', () => {
    expect(resolveCheckoutCta(true, null)).toEqual({
      label: 'Cobrar',
      accessibilityLabel: 'Finalizar venta',
      icon: 'checkmark-circle',
    });
  });

  it('avisa cuando la caja está cerrada', () => {
    const cta = resolveCheckoutCta(false, 'cash');

    expect(cta.label).toBe('Caja cerrada');
    expect(cta.icon).toBe('lock-closed-outline');
    // El lector de pantalla debe explicar la causa, no solo el estado.
    expect(cta.accessibilityLabel).toContain('caja');
  });

  it('pide el método de pago cuando todavía no se eligió', () => {
    const cta = resolveCheckoutCta(false, 'payment');

    expect(cta.label).toBe('Elegir pago');
    expect(cta.icon).toBe('arrow-down');
  });

  it('pide específicamente el baucher de la transferencia', () => {
    const cta = resolveCheckoutCta(false, 'receipt');

    expect(cta.label).toBe('Falta baucher');
    expect(cta.icon).toBe('camera-outline');
    expect(cta.accessibilityLabel.toLowerCase()).toContain('baucher');
  });

  it('cae en "Elegir pago" si no hay motivo conocido', () => {
    expect(resolveCheckoutCta(false, null).label).toBe('Elegir pago');
  });
});
