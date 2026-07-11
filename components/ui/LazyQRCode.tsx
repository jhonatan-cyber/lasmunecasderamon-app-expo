import React, { Suspense, lazy } from 'react';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, View } from 'react-native';

// ── Lazy load the QRCode component ────────────────────────────────────
// react-native-qrcode-svg (~50 KB min) + react-native-svg (~114 KB)
// are only loaded when this component is first rendered.
const QRCode = lazy(() => import('react-native-qrcode-svg'));

// ── Type ───────────────────────────────────────────────────────────────

type QRCodeProps = {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  quietZone?: number;
  ecl?: 'L' | 'M' | 'Q' | 'H';
  logo?: ImageSourcePropType;
  logoSize?: number;
  logoBorderRadius?: number;
  logoBackgroundColor?: string;
  logoMargin?: number;
};

interface LazyQRCodeProps extends QRCodeProps {
  /** Style applied to the outer placeholder/shimmer container */
  containerStyle?: StyleProp<ViewStyle>;
}

// ── Placeholder ────────────────────────────────────────────────────────

function QRPlaceholder({ size = 200 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
      }}
    >
      <ActivityIndicator size="small" color="#94A3B8" />
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────

export function LazyQRCode({
  containerStyle,
  ...qrProps
}: LazyQRCodeProps) {
  return (
    <Suspense
      fallback={<QRPlaceholder size={qrProps.size} />}
    >
      <View style={containerStyle}>
        <QRCode {...qrProps} />
      </View>
    </Suspense>
  );
}
