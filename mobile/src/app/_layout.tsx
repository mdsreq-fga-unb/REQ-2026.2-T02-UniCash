import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { completarRecorrencias } from '@/features/receitas/service';
import { completarRecorrenciasDespesas } from '@/features/despesas/service';
import { sincronizarPendentes } from '@/features/receitas/sync';

export default function RootLayout() {
  useEffect(() => {
    // Completa as recorrências antes de tentar sincronizar.
    Promise.all([
      completarRecorrencias(),
      completarRecorrenciasDespesas(),
    ])
      .catch(() => {})
      .finally(() => void sincronizarPendentes());
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}