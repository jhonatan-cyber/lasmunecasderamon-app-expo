import { memo, useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';

interface AnimatedNumberProps extends TextProps {
  value: number;
  /** Se aplica a cada fotograma; debe aceptar valores fraccionarios. */
  format?: (value: number) => string;
  duration?: number;
}

const defaultFormat = (value: number) => Math.round(value).toLocaleString();

function scheduleFrame(cb: () => void): number {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb);
  return setTimeout(cb, 16) as unknown as number;
}

function cancelFrame(id: number) {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
}

/**
 * Cuenta desde el valor anterior hasta el nuevo. El estado vive dentro del
 * componente, así que animar un total no vuelve a renderizar la fila que lo
 * contiene.
 */
export const AnimatedNumber = memo(function AnimatedNumber({
  value,
  format = defaultFormat,
  duration = 550,
  ...textProps
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    fromRef.current = value;
    const start = Date.now();

    const step = () => {
      const progress = duration <= 0 ? 1 : Math.min(1, (Date.now() - start) / duration);
      if (progress >= 1) {
        frameRef.current = null;
        setDisplay(value);
        return;
      }
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      frameRef.current = scheduleFrame(step);
    };

    frameRef.current = scheduleFrame(step);
    return () => {
      if (frameRef.current !== null) cancelFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [value, duration]);

  return <Text {...textProps}>{format(display)}</Text>;
});
