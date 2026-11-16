import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

import logger from '@/utils/logger';
export const DynamicSystemBars = () => {
  const { accentColor, isDark } = useAccentColor();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const updateNavigationBar = async () => {
      try {
        const setButtonStyleAsync = (NavigationBar as any).setButtonStyleAsync;
        if (typeof setButtonStyleAsync === 'function') {
          // Los botones del sistema deben contrastar con el fondo de la app.
          await setButtonStyleAsync(isDark ? 'light' : 'dark');
        }

        if (typeof NavigationBar.setVisibilityAsync === 'function') {
          await NavigationBar.setVisibilityAsync('visible');
        }

      } catch (error) {
        logger.captureException(error, { context: 'DynamicSystemBars:updateNavigationBar' });
      }
    };
    const timeout = setTimeout(updateNavigationBar, 100);
    return () => clearTimeout(timeout);
  }, [accentColor, isDark]);

  return null;
};


