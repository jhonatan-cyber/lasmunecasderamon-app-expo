import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import type { AcompanamientoBotellaItem } from '@/types/cart';
import { styles } from '../EntregaCortesiasModal.styles';
import type { Acompanamiento, Formato, RepartoInfo } from './types';

interface EntregaCortesiasAcompanamientoProps {
  formato: Formato;
  reparto: AcompanamientoBotellaItem[];
  info: RepartoInfo;
  onAgregarSabor: (opcion: Acompanamiento) => void;
  onAjustarSabor: (presentacionId: string, delta: number) => void;
  onQuitarSabor: (presentacionId: string) => void;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

/** Reparto del acompañamiento analcohólico de un corte o botella. */
export function EntregaCortesiasAcompanamiento({
  formato,
  reparto,
  info,
  onAgregarSabor,
  onAjustarSabor,
  onQuitarSabor,
  accentColor,
  textPrimary,
  textSecondary,
  borderColor,
}: EntregaCortesiasAcompanamientoProps) {
  const unidades = info.unidadesRequeridas;
  const sufijo = unidades === 1 ? '' : 'es';

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={[styles.miniLabel, { color: textSecondary }]}>
        {formato === 'corte' ? 'ACOMPAÑAMIENTO DEL CORTE' : 'ACOMPAÑAMIENTO INCLUIDO'}
      </Text>
      {info.opcionesCover.length === 0 ? (
        <Text style={{ color: textSecondary, fontSize: 11 }}>
          Sin bebidas cover habilitadas en el bar.
        </Text>
      ) : (
        <>
          <Text style={{ color: textSecondary, fontSize: 11, marginTop: 4 }}>
            {info.restante > 0
              ? `Reparte ${unidades} unidad${sufijo} por entrega · ${info.asignado}/${unidades}`
              : `Reparto completo · ${unidades} unidad${sufijo} por entrega`}
          </Text>

          {reparto.map(sabor => {
            const max = info.maxDe(sabor);
            const nombre = sabor.nombre || sabor.presentacion_id;
            return (
              <View key={sabor.presentacion_id} style={styles.saborRow}>
                <Text
                  style={{ color: textPrimary, flex: 1, fontSize: 12 }}
                  numberOfLines={1}
                >
                  {nombre}
                </Text>
                <Pressable
                  onPress={() => onAjustarSabor(sabor.presentacion_id, -1)}
                  disabled={sabor.unidades <= 1}
                  hitSlop={8}
                  style={[
                    styles.saborBtn,
                    { borderColor, opacity: sabor.unidades <= 1 ? 0.35 : 1 },
                  ]}
                >
                  <Ionicons name="remove" size={14} color={textPrimary} />
                </Pressable>
                <Text style={[styles.saborValue, { color: textPrimary }]}>{sabor.unidades}</Text>
                <Pressable
                  onPress={() => onAjustarSabor(sabor.presentacion_id, 1)}
                  disabled={sabor.unidades >= max}
                  hitSlop={8}
                  style={[
                    styles.saborBtn,
                    { opacity: sabor.unidades >= max ? 0.35 : 1 },
                  ]}
                >
                  <Ionicons name="add" size={14} color={accentColor} />
                </Pressable>
                <Pressable
                  onPress={() => onQuitarSabor(sabor.presentacion_id)}
                  hitSlop={8}
                  style={styles.saborBtn}
                >
                  <Ionicons name="close" size={14} color={textSecondary} />
                </Pressable>
              </View>
            );
          })}

          {info.restante > 0 && info.opcionesParaAgregar.length > 0 && (
            <View style={styles.chips}>
              {info.opcionesParaAgregar.map(opcion => (
                <Pressable
                  key={opcion.presentacion_id}
                  onPress={() => onAgregarSabor(opcion)}
                  style={[styles.chip, { borderColor }]}
                >
                  <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>
                    +{' '}
                    {[opcion.producto_nombre, opcion.presentacion_nombre]
                      .filter(Boolean)
                      .join(' ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}
