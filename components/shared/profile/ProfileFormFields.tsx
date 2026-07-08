import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface FieldConfig {
  icon: string;
  label: string;
  field: string;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad";
  secureTextEntry?: boolean;
}

const FIELDS: FieldConfig[] = [
  { icon: "star-outline", label: "Nickname / Nombre de Escena", field: "nick", placeholder: "Tu nick" },
  { icon: "call-outline", label: "Teléfono", field: "phone", keyboardType: "phone-pad" },
  { icon: "location-outline", label: "Dirección", field: "address" },
  { icon: "lock-closed-outline", label: "Nueva Contraseña", field: "password", placeholder: "*********", secureTextEntry: true },
];

interface Props {
  formData: any;
  updateField: (field: string, value: string) => void;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  cardBg: string;
  onOpenCivilPicker: () => void;
}

export function ProfileFormFields({ formData, updateField, accentColor, textPrimary, textSecondary, borderColor, cardBg, onOpenCivilPicker }: Props) {
  return (
    <>
      {FIELDS.map((cfg) => (
        <View key={cfg.field} style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: textSecondary }]}>{cfg.label}</Text>
          <View style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={20} color={accentColor} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: textPrimary }]}
              value={formData[cfg.field] || ""}
              onChangeText={(val) => updateField(cfg.field, val)}
              placeholder={cfg.placeholder}
              placeholderTextColor={textSecondary}
              keyboardType={cfg.keyboardType || "default"}
              secureTextEntry={cfg.secureTextEntry}
            />
          </View>
        </View>
      ))}

      {}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: textSecondary }]}>Estado Civil</Text>
        <Pressable style={[styles.inputWrapper, { backgroundColor: cardBg, borderColor }]} onPress={onOpenCivilPicker}>
          <Ionicons name="heart-outline" size={20} color={accentColor} style={styles.inputIcon} />
          <Text style={[styles.input, { color: textPrimary, paddingTop: 12 }]}>{formData.estadoCivil || "Seleccionar"}</Text>
          <Ionicons name="chevron-down" size={20} color={textSecondary} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "700", marginBottom: 8, marginLeft: 4 },
  inputWrapper: { height: 56, borderWidth: 1, borderRadius: 18, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: "600" },
});
