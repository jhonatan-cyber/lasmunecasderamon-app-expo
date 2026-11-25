import { describe, expect, it } from 'vitest';

import { getHomeRouteByRole } from '@/utils/userRole';

describe('ruta principal por rol', () => {
  it.each([
    ['garzon', '/(app)/garzon/(tabs)'],
    ['anfitriona', '/(app)/anfitriona/(tabs)'],
    ['barman', '/(app)/barman/(tabs)'],
    ['cajero', '/(app)/cajero/(tabs)'],
    ['admin', '/(app)/cajero/(tabs)'],
  ] as const)('envía el rol %s a su módulo', (role, route) => {
    expect(getHomeRouteByRole({ role })).toBe(route);
  });

  it.each([null, undefined, { role: '' }, { role: 'desconocido' }])(
    'no asigna un módulo operativo a un usuario sin rol reconocido (%s)',
    (user) => {
      expect(getHomeRouteByRole(user)).toBeNull();
    },
  );
});