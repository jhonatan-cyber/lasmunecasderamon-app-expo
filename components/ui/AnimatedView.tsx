import React, { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// ── Types ──────────────────────────────────────────────────────────────

type AnimatedStyleProp = {
  opacity?: number;
  translateY?: number;
  translateX?: number;
  scale?: number;
  /** Animates the view height (number only; requires overflow: 'hidden' in style) */
  height?: number;
};

type SpringConfig = {
  type: 'spring';
  delay?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
};

type TimingConfig = {
  type?: 'timing';
  delay?: number;
  duration?: number;
  easing?: any;
  /** If true, repeats indefinitely (used with withRepeat) */
  loop?: boolean;
  /** If true, animation reverses every cycle (only used when loop is true). Default: true */
  repeatReverse?: boolean;
};

type TransitionConfig = SpringConfig | TimingConfig;

interface AnimatedViewProps {
  children?: ReactNode;
  /** Initial style values before animation */
  from?: AnimatedStyleProp;
  /** Target style values to animate to */
  animate?: AnimatedStyleProp;
  /** Transition configuration (timing or spring) */
  transition?: TransitionConfig;
  /** Applied as the final combined style */
  style?: StyleProp<ViewStyle>;
  /** Any additional props forwarded to the underlying Animated.View */
  [key: string]: any;
}

// ── Helpers ────────────────────────────────────────────────────────────

function animateSharedValue(
  sv: SharedValue<number>,
  toVal: number,
  config: TransitionConfig,
  delay: number,
) {
  // Start at `from` value then animate to `to` with the configured chain
  let animation: number;

  if (config.type === 'spring') {
    const s = config as SpringConfig;
    animation = withSpring(toVal, {
      damping: s.damping ?? 10,
      stiffness: s.stiffness ?? 100,
      mass: s.mass ?? 1,
    }) as unknown as number;
  } else {
    const t = config as TimingConfig;
    animation = withTiming(toVal, {
      duration: t.duration ?? 300,
      easing: t.easing ?? Easing.out(Easing.quad),
    }) as unknown as number;
  }

  // Wrap in withRepeat if looping
  if ((config as TimingConfig).loop) {
    const repeatReverse = (config as TimingConfig).repeatReverse ?? true;
    animation = withRepeat(animation, -1, repeatReverse) as unknown as number;
  }

  // Apply delay
  if (delay > 0) {
    animation = withDelay(delay, animation as any) as unknown as number;
  }

  sv.value = animation;
}

// ── Component ──────────────────────────────────────────────────────────

export function AnimatedView({
  children,
  from = {},
  animate = {},
  transition = { type: 'timing', duration: 300 },
  style,
  ...rest
}: AnimatedViewProps) {
  // Shared values initialised with `from` values (defaults: opacity=1, scale=1, translate=0)
  const opacity = useSharedValue(from.opacity ?? 1);
  const translateY = useSharedValue(from.translateY ?? 0);
  const translateX = useSharedValue(from.translateX ?? 0);
  const scale = useSharedValue(from.scale ?? 1);
  const heightVal = useSharedValue(
    typeof from.height === 'number' ? from.height : -1,
  );

  useEffect(() => {
    const delay = transition.delay ?? 0;

    if (animate.opacity !== undefined)
      animateSharedValue(opacity, animate.opacity, transition, delay);
    if (animate.translateY !== undefined)
      animateSharedValue(translateY, animate.translateY, transition, delay);
    if (animate.translateX !== undefined)
      animateSharedValue(translateX, animate.translateX, transition, delay);
    if (animate.scale !== undefined)
      animateSharedValue(scale, animate.scale, transition, delay);
    if (animate.height !== undefined && typeof animate.height === 'number')
      animateSharedValue(heightVal, animate.height, transition, delay);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const transforms: Record<string, number>[] = [];
    if (translateX.value !== 0) transforms.push({ translateX: translateX.value });
    if (translateY.value !== 0) transforms.push({ translateY: translateY.value });
    if (scale.value !== 1) transforms.push({ scale: scale.value });

    return {
      opacity: opacity.value,
      ...(heightVal.value >= 0 ? { height: heightVal.value } : {}),
      ...(transforms.length > 0 ? { transform: transforms } : {}),
    } as any;
  });

  return (
    <Animated.View style={[style as any, animatedStyle]} {...rest}>
      {children}
    </Animated.View>
  );
}
