import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, TextInput, View } from 'react-native';
import { formatCurrency } from '@/utils/format';
import { styles } from '../EntregaCortesiasModal.styles';
import { EntregaCortesiasAcompanamiento } from './EntregaCortesiasAcompanamiento';
import { calcularReparto } from './helpers';
import type { Acompanamiento, Bebida, Formato, LineaSeleccion } from './types';

interface EntregaCortesiasProductoProps {
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
  onCambiarAdicional: (valor: string) => void;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  isDark: boolean;
}

/** Fila de una bebida entregable: stepper, reparto del acompañamiento y adicional. */
export function EntregaCortesiasProducto({
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
  onCambiarAdicional,
  accentColor,
  textPrimary,
  textSecondary,
  borderColor,
  isDark,
}: EntregaCortesiasProductoProps) {
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
            <EntregaCortesiasAcompanamiento
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

          <View style={{ marginTop: 8 }}>
            <Text style={[styles.miniLabel, { color: textSecondary }]}>
              ADICIONAL POR UNIDAD (OPCIONAL)
            </Text>
            <TextInput
              value={linea.adicional}
              onChangeText={onCambiarAdicional}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                  borderColor,
                  color: textPrimary,
                  marginTop: 4,
                },
              ]}
            />
          </View>

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
