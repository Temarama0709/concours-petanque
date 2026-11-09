import '@/i18n';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/config/app';
import { LockScreen } from '@/components/LockScreen';
import { AppProvider, useApp } from '@/state/AppContext';

function RootNavigator() {
  const { t } = useTranslation();
  const { ready, locked } = useApp();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (locked) return <LockScreen />;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerBackTitle: t('common.back'),
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/language" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="onboarding/legal" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="auth/index" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="home" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="step/[id]" options={{ title: '' }} />
      <Stack.Screen name="purchase/[id]" options={{ title: '', presentation: 'modal' }} />
      <Stack.Screen name="settings/index" options={{ title: t('settings.title') }} />
      <Stack.Screen name="settings/account" options={{ title: t('settings.editAccount') }} />
      <Stack.Screen name="settings/document/[doc]" options={{ title: '' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AppProvider>
  );
}
