import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAccentColor } from '../hooks/useAccentColor';

export const DynamicSystemBars = () => {
  const { accentColor } = useAccentColor();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const updateNavigationBar = async () => {
      try {
        // Mantener color de fondo personalizado en Android
        await NavigationBar.setBackgroundColorAsync(accentColor);
        await NavigationBar.setButtonStyleAsync('light');
        await NavigationBar.setVisibilityAsync('visible');
        // No llamar a setBehaviorAsync para evitar el warning con edge-to-edge
      } catch (error) {
        console.log('Error setting navigation bar color:', error);
      }
    };

    const timeout = setTimeout(updateNavigationBar, 100);
    return () => clearTimeout(timeout);
  }, [accentColor]);

  return null;
};

