import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { FontFamily } from '@/constants/fonts';
import { OrderProductPhoto } from '@/components/shared/OrderProductPhoto';
import { useAccentColor } from '@/hooks/useAccentColor';
import { SearchBar } from '@/components/ui/SearchBar';

interface MixerChoice {
  id: string;
  producto_nombre: string;
  nombre: string;
  foto?: string;
  producto_foto?: string;
  stock_bar?: number;
  ml_abierta?: number;
}

interface MixerSelectorModalProps {
  visible: boolean;
  title: string;
  search: string;
  setSearch: (value: string) => void;
  choices: MixerChoice[];
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  sinRecargo: boolean;
  topeAcompanamiento: number;
  stockLabel: (choice: MixerChoice) => string | null;
  precioOf: (choice: MixerChoice) => number;
  onSelect: (choice: MixerChoice) => void;
  onClose: () => void;
}

export const MixerSelectorModal: React.FC<MixerSelectorModalProps> = ({
  visible,
  title,
  search,
  setSearch,
  choices,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  accentColor,
  sinRecargo,
  topeAcompanamiento,
  stockLabel,
  precioOf,
  onSelect,
  onClose,
}) => {
    const { accentOnSurface } = useAccentColor();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#0008',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 20,
            padding: 20,
            maxHeight: '80%',
            gap: 12,
          }}
        >
          <Text style={{ color: textPrimary, fontFamily: FontFamily.bold }}>
            {title}
          </Text>
          <SearchBar
            compact
            debounceMs={0}
            placeholder="Buscar producto o sabor"
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Buscar bebida en bar"
          />
          <ScrollView
            style={{ maxHeight: 360 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {choices.map((p) => {
              const stock = stockLabel(p);
              const precio = precioOf(p);
              const exceso = Math.max(0, precio - topeAcompanamiento);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => onSelect(p)}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor,
                    backgroundColor: cardBg,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <OrderProductPhoto
                      foto={
                        p.foto && p.foto !== 'default.png'
                          ? p.foto
                          : p.producto_foto
                      }
                      name={`${p.producto_nombre} ${p.nombre}`}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: textPrimary }}>
                        {p.producto_nombre} {p.nombre}
                      </Text>
                      {!sinRecargo && topeAcompanamiento > 0 && precio <= 0 && (
                        <Text style={{ color: accentOnSurface, fontSize: 12, marginTop: 2 }}>
                          Sin precio configurado: no suma excedente
                        </Text>
                      )}
                      {!sinRecargo && topeAcompanamiento > 0 && precio > 0 && (
                        <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                          {exceso > 0
                            ? `Suma $${exceso.toLocaleString('es-CL')} sobre el tope de $${topeAcompanamiento.toLocaleString('es-CL')}`
                            : 'Incluido en el tope'}
                        </Text>
                      )}
                    </View>
                  </View>
                  {!!stock && (
                    <Text style={{ color: textSecondary }}>{stock}</Text>
                  )}
                </Pressable>
              );
            })}
            {!choices.length && (
              <Text style={{ color: textSecondary }}>
                Sin productos disponibles en el bar
              </Text>
            )}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={{
              backgroundColor: accentColor,
              padding: 14,
              borderRadius: 14,
            }}
          >
            <Text
              style={{
                color: cardBg,
                textAlign: 'center',
                fontFamily: FontFamily.bold,
                fontSize: 16,
              }}
            >
              Cerrar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
