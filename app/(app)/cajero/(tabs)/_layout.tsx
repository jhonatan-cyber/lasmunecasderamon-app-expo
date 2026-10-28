import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from "expo-router";
import { useState } from "react";
import { PremiumTabBar } from "@/components/ui/PremiumTabBar";
import ProfileEditModal from "@/components/shared/ProfileEditModal";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function CajeroTabsLayout() {
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const esAdmin = useIsAdmin();

  // El administrador sólo usa la pestaña Inicio: no gestiona asistencia,
  // anticipos, propinas ni horas extras.
  const soloAdminOculto = { href: esAdmin ? null : undefined };

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
            ...soloAdminOculto,
            title: "Asistencia",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="anticipos"
          options={{
            ...soloAdminOculto,
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
            ...soloAdminOculto,
            title: "Propinas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="horas-extras"
          options={{
            ...soloAdminOculto,
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
