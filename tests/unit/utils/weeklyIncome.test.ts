import { describe, expect, it } from 'vitest';
import { calculateWeeklyGrowth } from '@/utils/weeklyIncome';

describe('calculateWeeklyGrowth', () => {
  it('compara el tramo equivalente de la semana actual con la anterior', () => {
    const weeklyIncome = [
      { day: '2026-03-09', total: 3000 },
      { day: '2026-03-10', total: 3000 },
      { day: '2026-03-16', total: 4000 },
      { day: '2026-03-17', total: 4000 },
    ];

    expect(calculateWeeklyGrowth(weeklyIncome)).toBeCloseTo(33.3, 1);
  });

  it('no calcula crecimiento sin datos de la semana anterior', () => {
    expect(calculateWeeklyGrowth([{ day: '2026-03-16', total: 4000 }])).toBeNull();
    expect(calculateWeeklyGrowth(undefined)).toBeNull();
  });

  it('no calcula un porcentaje cuando la semana anterior no tiene ingresos', () => {
    const weeklyIncome = [
      { day: '2026-03-09', total: 0 },
      { day: '2026-03-16', total: 4000 },
    ];

    expect(calculateWeeklyGrowth(weeklyIncome)).toBeNull();
  });
});