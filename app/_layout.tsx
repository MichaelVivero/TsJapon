import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../context/AuthContext';
import { BabyProvider } from '../context/BabyContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <BabyProvider>
        <PaperProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
          </Stack>
        </PaperProvider>
      </BabyProvider>
    </AuthProvider>
  );
}