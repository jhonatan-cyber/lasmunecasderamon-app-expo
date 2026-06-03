import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

import logger from '@/utils/logger';
export const DynamicSystemBars = () => {
  const { accentColor } = useAccentColor();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const updateNavigationBar = async () => {
      try {
        await (NavigationBar as any).setButtonStyleAsync('light');
        await NavigationBar.setVisibilityAsync('visible');

      } catch (error) {
        logger.captureException(error, { context: 'DynamicSystemBars:updateNavigationBar' });
      }
    };
    const timeout = setTimeout(updateNavigationBar, 100);
    return () => clearTimeout(timeout);
  }, [accentColor]);

  return null;
};


