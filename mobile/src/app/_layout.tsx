import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { completarRecorrencias } from '@/features/receitas/service';
import { sincronizarPendentes } from '@/features/receitas/sync';

export default function RootLayout() {
  useEffect(() => {
    // Ao abrir o app: completa a geração das séries sem término e tenta sincronizar.
    completarRecorrencias()
      .catch(() => {})
      .finally(() => void sincronizarPendentes());
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
