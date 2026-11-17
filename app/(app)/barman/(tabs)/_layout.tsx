import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from "expo-router";
import { useState } from "react";
import { PremiumTabBar } from "@/components/ui/PremiumTabBar";
import ProfileEditModal from "@/components/shared/ProfileEditModal";

export default function BarmanTabsLayout() {
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  return (
    <>
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
          name="asistencia"
          options={{
            title: "Asistencia",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={String(color)} />
            ),
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
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="propinas"
          options={{
            title: "Propinas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash" size={size} color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="horas-extras"
          options={{
            title: "Horas Extras",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time" size={size} color={String(color)} />
            ),
          }}
        />
      </Tabs>

      <ProfileEditModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </>
  );
}
