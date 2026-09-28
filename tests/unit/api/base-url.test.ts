import { afterEach, describe, it, expect, vi } from 'vitest';
import { PROD_API_BASE_URL } from '@lasmunecasderamon/config';
import { isLoopbackHost, parseBaseUrl, pickBaseUrl, pickDevHost } from '@/api/base-url';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock('react-native');
  vi.doUnmock('expo-constants');
  vi.resetModules();
});

// El `.env` real apunta a localhost: es el caso que rompía el emulador Android.
const ENV_LOCAL = 'http://localhost:3000';

describe('base-url — host de desarrollo por dispositivo', () => {
  describe('pickDevHost', () => {
    it('en web usa el host que sirvió la app', () => {
      expect(pickDevHost({ platform: 'web', webHostname: '192.168.1.50' })).toBe('192.168.1.50');
      expect(pickDevHost({ platform: 'web', webHostname: null })).toBe('localhost');
    });

    it('en emulador o teléfono usa la IP del dev server', () => {
      expect(pickDevHost({ platform: 'android', devServerHost: '192.168.1.50' })).toBe(
        '192.168.1.50',
      );
      expect(pickDevHost({ platform: 'ios', devServerHost: '192.168.1.50' })).toBe('192.168.1.50');
    });

    it('sin pista del dev server cae al alias del emulador Android', () => {
      expect(pickDevHost({ platform: 'android', devServerHost: null })).toBe('10.0.2.2');
    });

    it('si el dev server llegó por loopback, Android igual necesita el alias', () => {
      expect(pickDevHost({ platform: 'android', devServerHost: 'localhost' })).toBe('10.0.2.2');
      expect(pickDevHost({ platform: 'android', devServerHost: '127.0.0.1' })).toBe('10.0.2.2');
    });

    it('en el simulador de iOS el loopback sí sirve', () => {
      expect(pickDevHost({ platform: 'ios', devServerHost: 'localhost' })).toBe('localhost');
    });
  });

  describe('pickBaseUrl en desarrollo', () => {
    it('cambia el host del .env por el del dev server conservando el puerto', () => {
      expect(
        pickBaseUrl({
          isDev: true,
          envUrl: ENV_LOCAL,
          platform: 'android',
          devServerHost: '192.168.1.50',
        }),
      ).toBe('http://192.168.1.50:3000');
    });

    it('en el emulador Android sin dev server apunta al alias del host', () => {
      expect(pickBaseUrl({ isDev: true, envUrl: ENV_LOCAL, platform: 'android' })).toBe(
        'http://10.0.2.2:3000',
      );
    });

    it('respeta un puerto propio del .env', () => {
      expect(
        pickBaseUrl({
          isDev: true,
          envUrl: 'http://localhost:4000',
          platform: 'android',
          devServerHost: '192.168.1.50',
        }),
      ).toBe('http://192.168.1.50:4000');
    });

    it('respeta un host que no es loopback (staging u otra máquina)', () => {
      expect(
        pickBaseUrl({
          isDev: true,
          envUrl: 'http://192.168.1.99:3000',
          platform: 'android',
          devServerHost: '192.168.1.50',
        }),
      ).toBe('http://192.168.1.99:3000');
      expect(
        pickBaseUrl({
          isDev: true,
          envUrl: 'https://staging.midominio.com',
          platform: 'ios',
        }),
      ).toBe('https://staging.midominio.com');
    });

    it('en web usa el host del navegador', () => {
      expect(
        pickBaseUrl({
          isDev: true,
          envUrl: ENV_LOCAL,
          platform: 'web',
          webHostname: '127.0.0.1',
        }),
      ).toBe('http://127.0.0.1:3000');
    });

    it('sin dev server ni .env usa el puerto de la app (3000)', () => {
      expect(pickBaseUrl({ isDev: true, envUrl: null, platform: 'ios' })).toBe(
        'http://localhost:3000',
      );
    });
  });

  describe('pickBaseUrl fuera de desarrollo', () => {
    it('usa el .env si está definido y el dominio de producción si no', () => {
      expect(pickBaseUrl({ isDev: false, envUrl: 'https://api.midominio.com', platform: 'android' }))
        .toBe('https://api.midominio.com');
      expect(pickBaseUrl({ isDev: false, envUrl: undefined, platform: 'android' })).toBe(
        PROD_API_BASE_URL,
      );
    });
  });

  // La regresión que motivó todo esto: el .env del repo apunta a localhost y en un
  // dispositivo real eso es el propio dispositivo, no la máquina de desarrollo.
  describe('BASE_URL resuelta al cargar el módulo', () => {
    const cargarConDispositivo = async (platform: string, hostUri: string | null) => {
      vi.resetModules();
      vi.doMock('react-native', () => ({
        Platform: { OS: platform, select: (obj: any) => obj?.[platform] ?? obj?.default },
      }));
      vi.doMock('expo-constants', () => ({ default: { expoConfig: hostUri ? { hostUri } : null } }));
      vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', ENV_LOCAL);
      return (await import('@/api/base-url')) as typeof import('@/api/base-url');
    };

    it('en un teléfono Android usa la IP del dev server, no localhost', async () => {
      const { BASE_URL, API_URL } = await cargarConDispositivo('android', '192.168.1.50:8081');

      expect(BASE_URL).toBe('http://192.168.1.50:3000');
      expect(API_URL).toBe('http://192.168.1.50:3000/api');
    });

    it('en un emulador Android sin dev server usa el alias del host', async () => {
      const { BASE_URL } = await cargarConDispositivo('android', null);

      expect(BASE_URL).toBe('http://10.0.2.2:3000');
    });

    it('en el simulador de iOS el propio localhost del .env sirve', async () => {
      const { BASE_URL } = await cargarConDispositivo('ios', null);

      expect(BASE_URL).toBe('http://localhost:3000');
    });
  });

  describe('helpers', () => {
    it('detecta loopbacks', () => {
      expect(isLoopbackHost('localhost')).toBe(true);
      expect(isLoopbackHost('127.0.0.1')).toBe(true);
      expect(isLoopbackHost('::1')).toBe(true);
      expect(isLoopbackHost('10.0.2.2')).toBe(false);
      expect(isLoopbackHost('192.168.1.50')).toBe(false);
    });

    it('separa host y puerto', () => {
      expect(parseBaseUrl('http://localhost:3000')).toEqual({ host: 'localhost', port: '3000' });
      expect(parseBaseUrl('exp://192.168.1.50:8081/--/sales')).toEqual({
        host: '192.168.1.50',
        port: '8081',
      });
      expect(parseBaseUrl('https://api.midominio.com/api')).toEqual({
        host: 'api.midominio.com',
        port: null,
      });
    });
  });
});
