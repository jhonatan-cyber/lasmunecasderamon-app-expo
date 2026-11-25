import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface LoginLandscapeLayoutProps {
  backgroundColor: string;
  backgroundImageSource: number;
  logoImageSource: number;
  insets: Insets;
  children: ReactNode;
}

export default function LoginLandscapeLayout({
  backgroundColor,
  backgroundImageSource,
  logoImageSource,
  insets,
  children,
}: LoginLandscapeLayoutProps) {
  return (
    <View style={[styles.layout, { backgroundColor }]}>
      <View style={styles.brandPanel}>
        <Image
          source={backgroundImageSource}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel="Escenario del club con música en vivo"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.24)', 'rgba(0,0,0,0.58)']}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.brandContent,
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 24,
              paddingLeft: insets.left + 24,
            },
          ]}
        >
          <Image
            source={logoImageSource}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Logo de Las Muñecas de Ramón"
          />
        </View>
      </View>

      <View style={[styles.formPanel, { backgroundColor, paddingRight: insets.right }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  brandPanel: {
    width: '45%',
    overflow: 'hidden',
    position: 'relative',
  },
  brandContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 24,
  },
  logo: {
    width: '100%',
    maxWidth: 320,
    height: 190,
  },
  formPanel: {
    flex: 1,
    minWidth: 0,
  },
});