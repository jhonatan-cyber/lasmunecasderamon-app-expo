import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        orientation: "default",
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="verify-code" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}
