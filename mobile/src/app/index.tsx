import { useEffect, useState } from 'react';
import { Link, Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSessao } from '@/features/conta/sessao';
import { decidirContinuarSemConta } from '@/features/conta/onboarding';
import { cores } from '@/lib/theme';

export default function Home() {
  const sessao = useSessao();
  const [estado, setEstado] = useState<'verificando' | 'cadastro' | 'inicio'>('verificando');

  useEffect(() => {
    let ativo = true;

    if (sessao.status === 'ativa') {
      setEstado('inicio');
      return;
    }

    void decidirContinuarSemConta().then((continuarSemConta) => {
      if (ativo) setEstado(continuarSemConta ? 'inicio' : 'cadastro');
    });

    return () => {
      ativo = false;
    };
  }, [sessao.status]);

  if (estado === 'verificando') return null;
  if (estado === 'cadastro') return <Redirect href="/conta/cadastro" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>UniCash</Text>
      <Link href="/receitas" style={styles.link}>
        Receitas
      </Link>
      <Link href="/conta" style={styles.link}>
        Conta
      </Link>
      <Link href="/despesas" style={styles.link}>
        Despesas
      </Link>
      <Link href="/categorias" style={styles.link}>
        Categorias
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', gap: 16 },
  title: { fontSize: 32, fontWeight: '700', color: cores.marinho },
  link: { fontSize: 18, fontWeight: '600', color: cores.primaria },
});
