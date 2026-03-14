import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: 0 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6', // Bright blue focus
        tabBarInactiveTintColor: '#94a3b8',
        tabBarShowLabel: true, // Restore Spanish text
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          elevation: 5,
          backgroundColor: '#ffffff',
          borderRadius: 40,
          height: 70,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          borderTopWidth: 0, // remove default borderline
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerShown: false, // Custom header handled in screen
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={28} color={color} style={{ marginTop: 5 }} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progreso',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome name="heartbeat" size={26} color={color} style={{ marginTop: 5 }} />,
        }}
      />
    </Tabs>
  );
}
