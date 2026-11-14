import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { cores } from '@/lib/theme';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>UniCash</Text>
      <Link href="/receitas" style={styles.link}>
        Receitas
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', gap: 16 },
  title: { fontSize: 32, fontWeight: '700', color: cores.marinho },
  link: { fontSize: 18, fontWeight: '600', color: cores.primaria },
});
