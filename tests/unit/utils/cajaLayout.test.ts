import { describe, expect, it } from 'vitest';
import { columnasCaja } from '@/utils/cajaLayout';

describe('columnasCaja', () => {
    it('móvil vertical usa 2 columnas', () => {
        expect(columnasCaja(false, false)).toBe(2);
    });

    it('móvil horizontal usa 3 columnas', () => {
        expect(columnasCaja(false, true)).toBe(3);
    });

    it('tablet usa 4 columnas en ambas orientaciones', () => {
        expect(columnasCaja(true, false)).toBe(4);
        expect(columnasCaja(true, true)).toBe(4);
    });
});
