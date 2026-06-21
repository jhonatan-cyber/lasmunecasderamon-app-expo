import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useState } from "react";
import { PremiumTabBar } from "@/components/ui/PremiumTabBar";
import ProfileEditModal from "@/components/shared/ProfileEditModal";

export default function CajeroTabsLayout() {
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  return (
    <>
      <Tabs
        tabBar={(props: any) => <PremiumTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="asistencia"
          options={{
            title: "Asistencia",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="anticipos"
          options={{
            title: "Anticipos",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="card" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="propinas"
          options={{
            title: "Propinas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="horas-extras"
          options={{
            title: "Horas Extras",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time" size={size} color={color} />
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
