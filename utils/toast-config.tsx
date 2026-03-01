import React from "react";
import { View, Text, ViewStyle, TextStyle } from "react-native";
import {
  BaseToast,
  ErrorToast,
  InfoToast,
  ToastConfig,
  BaseToastProps,
} from "react-native-toast-message";

// Tipado explícito para evitar errores de TypeScript con DimensionValue
const commonStyle: ViewStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  width: "92%",
  height: 85,
  borderLeftWidth: 8,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 8,
  alignSelf: "center",
};

const commonContentContainerStyle: ViewStyle = {
  paddingHorizontal: 20,
};

const commonText1Style: TextStyle = {
  fontSize: 17,
  fontWeight: "800",
  color: "#111827",
};

const commonText2Style: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: "#6B7280",
};

export const toastConfig: ToastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[commonStyle, { borderLeftColor: "#10B981" }]}
      contentContainerStyle={commonContentContainerStyle}
      text1Style={commonText1Style}
      text2Style={commonText2Style}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={[commonStyle, { borderLeftColor: "#EF4444" }]}
      contentContainerStyle={commonContentContainerStyle}
      text1Style={commonText1Style}
      text2Style={commonText2Style}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
  info: (props: BaseToastProps) => (
    <InfoToast
      {...props}
      style={[commonStyle, { borderLeftColor: "#3B82F6" }]}
      contentContainerStyle={commonContentContainerStyle}
      text1Style={commonText1Style}
      text2Style={commonText2Style}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
  order: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[commonStyle, { borderLeftColor: "#E11D48" }]}
      contentContainerStyle={commonContentContainerStyle}
      text1Style={commonText1Style}
      text2Style={commonText2Style}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
      renderLeadingIcon={() => (
        <View style={{ justifyContent: "center", paddingLeft: 15 }}>
          <Text style={{ fontSize: 24 }}>🛍️</Text>
        </View>
      )}
    />
  ),
  // Alias para advertencias o tipos personalizados
  warning: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[commonStyle, { borderLeftColor: "#F59E0B" }]}
      contentContainerStyle={commonContentContainerStyle}
      text1Style={commonText1Style}
      text2Style={commonText2Style}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
};
