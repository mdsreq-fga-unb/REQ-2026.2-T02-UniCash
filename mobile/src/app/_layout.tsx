import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { completarRecorrencias } from '@/features/receitas/service';
import { completarRecorrenciasDespesas } from '@/features/despesas/service';
import { sincronizarPendentes } from '@/features/receitas/sync';

export default function RootLayout() {
  useEffect(() => {
    // As duas rotinas gravam no mesmo SQLite, em transações exclusivas.
    async function iniciar() {
      try {
        await completarRecorrencias();
      } catch (erro) {
        console.warn('Falha ao completar as recorrências de receitas.', erro);
      }

      try {
        await completarRecorrenciasDespesas();
      } catch (erro) {
        console.warn('Falha ao completar as recorrências de despesas.', erro);
      }

      await sincronizarPendentes();
    }

    void iniciar();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}