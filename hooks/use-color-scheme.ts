import { useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { useAppearanceStore } from '@/store/appearanceStore';

export function useColorScheme(): 'light' | 'dark' {
  const storedScheme = useAppearanceStore((state) => state.scheme);
  // El esquema se conoce al montar: así el primer render usa el valor correcto
  // y el efecto solo se suscribe a cambios externos.
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(() => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return 'light';
    }
    return Appearance?.getColorScheme?.() === 'dark' ? 'dark' : 'light';
  });
  
  // Detect system scheme changes based on platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // On web, use matchMedia to detect system preference without touching Appearance
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handler = (e: MediaQueryListEvent) => {
          setSystemScheme(e.matches ? 'dark' : 'light');
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      }
    } else {
      // On native, subscribe to changes in the system preference. El valor
      // inicial ya se leyó al montar, así que no hace falta sincronizarlo acá.
      const subscription = Appearance?.addChangeListener?.(
        ({ colorScheme }) => {
          setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
        },
      );

      return () => subscription?.remove();
    }
    return () => {};
  }, []);
  
  // If user has explicitly set a scheme, use it; otherwise fall back to system
  return storedScheme ?? systemScheme;
}
