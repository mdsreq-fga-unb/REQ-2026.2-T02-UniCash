import { router } from 'expo-router';

export function abrirTutorial(origem: 'manual' | 'primeiro-acesso' = 'manual'): void {
  if (origem === 'primeiro-acesso') {
    router.push({ pathname: '/tutorial', params: { origem } });
    return;
  }
  router.push('/tutorial');
}
