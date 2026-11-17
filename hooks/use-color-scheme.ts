import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAppearanceStore } from '@/store/appearanceStore';

export function useColorScheme(): 'light' | 'dark' {
  const storedScheme = useAppearanceStore((state) => state.scheme);
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>('light');
  
  // Detect system scheme changes based on platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // On web, use matchMedia to detect system preference without touching Appearance
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setSystemScheme(mediaQuery.matches ? 'dark' : 'light');
        
        const handler = (e: MediaQueryListEvent) => {
          setSystemScheme(e.matches ? 'dark' : 'light');
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      }
    } else {
      // On native, use Appearance API to detect system preference
      import('react-native').then(({ Appearance }) => {
        const current = Appearance.getColorScheme();
        setSystemScheme(current === 'dark' ? 'dark' : 'light');
        
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
          setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
        });
        
        return () => {
          subscription?.remove();
        };
      });
    }
    return () => {};
  }, []);
  
  // If user has explicitly set a scheme, use it; otherwise fall back to system
  return storedScheme ?? systemScheme;
}
