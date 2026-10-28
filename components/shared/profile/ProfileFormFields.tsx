import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, TextInput, View } from "react-native";
import { styles } from "../PremiumProfileView.styles";

export interface ProfileFormData {
  nick: string;
  phone: string;
  address: string;
  estadoCivil: string;
  password: string;
}

interface ProfileFormFieldsProps {
  formData: ProfileFormData;
  updateField: (field: string, value: any) => void;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  onOpenCivilPicker: () => void;
}

export function ProfileFormFields({
  formData,
  updateField,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  onOpenCivilPicker,
}: ProfileFormFieldsProps) {
  const wrapperStyle = [styles.inputWrapper, { backgroundColor: cardBg, borderColor }];

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: textSecondary }]}>
          Nickname / Nombre de Escena
        </Text>
        <View style={wrapperStyle}>
          <Ionicons
            name="star-outline"
            size={20}
            color={accentColor}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: textPrimary }]}
            value={formData.nick}
            onChangeText={(val) => updateField("nick", val)}
            placeholder="Tu nick"
            placeholderTextColor={textSecondary}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: textSecondary }]}>
          Teléfono
        </Text>
        <View style={wrapperStyle}>
          <Ionicons
            name="call-outline"
            size={20}
            color={accentColor}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: textPrimary }]}
            value={formData.phone}
            onChangeText={(val) => updateField("phone", val)}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: textSecondary }]}>
          Dirección
        </Text>
        <View style={wrapperStyle}>
          <Ionicons
            name="location-outline"
            size={20}
            color={accentColor}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: textPrimary }]}
            value={formData.address}
            onChangeText={(val) => updateField("address", val)}
          />
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: textSecondary }]}>
          Estado Civil
        </Text>
        <Pressable style={wrapperStyle} onPress={onOpenCivilPicker}>
          <Ionicons
            name="heart-outline"
            size={20}
            color={accentColor}
            style={styles.inputIcon}
          />
          <Text style={[styles.input, { color: textPrimary, paddingTop: 12 }]}>
            {formData.estadoCivil}
          </Text>
          <Ionicons name="chevron-down" size={20} color={textSecondary} />
        </Pressable>
      </View>

      <View style={[styles.divider, { backgroundColor: borderColor }]} />

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: textSecondary }]}>
          Nueva Contraseña
        </Text>
        <View style={wrapperStyle}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={accentColor}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: textPrimary }]}
            value={formData.password}
            onChangeText={(val) => updateField("password", val)}
            secureTextEntry
            placeholder="*********"
          />
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: borderColor }]} />
    </>
  );
}
