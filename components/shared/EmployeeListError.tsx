import { Pressable, Text, View } from 'react-native';
export function EmployeeListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        margin: 16,
        padding: 16,
        gap: 12,
        borderRadius: 24,
        backgroundColor: '#FEF2F2',
      }}
    >
      <Text style={{ color: '#991B1B' }}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        onPress={onRetry}
        style={{
          alignSelf: 'flex-start',
          borderRadius: 9999,
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: '#991B1B',
        }}
      >
        <Text style={{ color: '#FFFFFF' }}>Reintentar</Text>
      </Pressable>
    </View>
  );
}
