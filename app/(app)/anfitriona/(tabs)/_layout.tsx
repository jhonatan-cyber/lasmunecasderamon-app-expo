import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";
import { PremiumTabBar } from "@/components/ui/PremiumTabBar";
import ProfileEditModal from "@/components/shared/ProfileEditModal";
import { RegistroAsistenciaModal } from "@/components/shared/RegistroAsistenciaModal";

export default function AnfitrionaTabsLayout() {
  const { bg } = useAccentColor();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Tabs
        tabBar={(props: any) => <PremiumTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 0,
            borderRadius: 24,
            elevation: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            borderTopWidth: 0,
          },
        }}
      >
        <Tabs.Screen
          name="servicios"
          options={{
            title: "Servicios",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="comisiones"
          options={{
            title: "Ventas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="asistencia"
          options={{
            title: "Asistencia",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={String(color)} />
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="anticipos"
          options={{
            title: "Anticipos",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="card" size={size} color={String(color)} />
            ),
          }}
        />
      </Tabs>

      <ProfileEditModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />

      <RegistroAsistenciaModal
        visible={showAsistenciaModal}
        onClose={() => setShowAsistenciaModal(false)}
        onRegistered={() => {
          setShowAsistenciaModal(false);
        }}
      />
    </View>
  );
}
