import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import { formatCurrency } from '@/utils/format';
import { styles } from '../EntregaCoversModal.styles';
import { EntregaCoversAcompanamiento } from './EntregaCoversAcompanamiento';
import { calcularReparto } from './helpers';
import type { Acompanamiento, Bebida, Formato, LineaSeleccion } from './types';

interface EntregaCoversProductoProps {
  bebida: Bebida;
  formato: Formato;
  linea: LineaSeleccion | undefined;
  precio: number;
  limiteAlcanzado: boolean;
  acompanamientos: Acompanamiento[];
  onAgregar: () => void;
  onQuitar: () => void;
  onAgregarSabor: (opcion: Acompanamiento) => void;
  onAjustarSabor: (presentacionId: string, delta: number) => void;
  onQuitarSabor: (presentacionId: string) => void;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

/** Fila de una bebida entregable: stepper y reparto del acompañamiento. */
export function EntregaCoversProducto({
  bebida,
  formato,
  linea,
  precio,
  limiteAlcanzado,
  acompanamientos,
  onAgregar,
  onQuitar,
  onAgregarSabor,
  onAjustarSabor,
  onQuitarSabor,
  accentColor,
  textPrimary,
  textSecondary,
  borderColor,
}: EntregaCoversProductoProps) {
  const reparto = linea?.reparto ?? [];
  const info = calcularReparto(
    bebida,
    formato,
    reparto,
    linea?.cantidad ?? 1,
    acompanamientos,
  );

  return (
    <View
      style={[
        styles.producto,
        {
          borderColor: linea ? accentColor : borderColor,
          backgroundColor: linea ? `${accentColor}14` : 'transparent',
        },
      ]}
    >
      <View style={styles.productoFila}>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: textPrimary, fontWeight: '700', fontSize: 13 }}
            numberOfLines={2}
          >
            {[bebida.producto_nombre, bebida.presentacion_nombre].filter(Boolean).join(' ')}
          </Text>
          <Text style={{ color: textSecondary, fontSize: 11 }}>
            {formato === 'corte' ? 'Corte' : 'Botella sin anfitriona'} ·{' '}
            {formatCurrency(precio)} · stock {bebida.stock_bar}
          </Text>
        </View>
        <View style={styles.stepper}>
          <Pressable
            onPress={onQuitar}
            disabled={!linea}
            hitSlop={8}
            style={[styles.stepperBtn, { borderColor, opacity: linea ? 1 : 0.35 }]}
          >
            <Ionicons name="remove" size={16} color={textPrimary} />
          </Pressable>
          <Text style={[styles.stepperValue, { color: textPrimary }]}>
            {linea?.cantidad ?? 0}
          </Text>
          <Pressable
            onPress={onAgregar}
            disabled={limiteAlcanzado}
            hitSlop={8}
            style={[
              styles.stepperBtn,
              {
                borderColor,
                backgroundColor: limiteAlcanzado ? 'transparent' : `${accentColor}1F`,
                opacity: limiteAlcanzado ? 0.35 : 1,
              },
            ]}
          >
            <Ionicons name="add" size={16} color={accentColor} />
          </Pressable>
        </View>
      </View>

      {linea && (
        <>
          {info.requerido && (
            <EntregaCoversAcompanamiento
              formato={formato}
              reparto={reparto}
              info={info}
              onAgregarSabor={onAgregarSabor}
              onAjustarSabor={onAjustarSabor}
              onQuitarSabor={onQuitarSabor}
              accentColor={accentColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              borderColor={borderColor}
            />
          )}

          {info.falta && (
            <Text style={{ color: '#F59E0B', fontSize: 11, marginTop: 6 }}>
              Reparte el acompañamiento para continuar.
            </Text>
          )}
        </>
      )}
    </View>
  );
}
