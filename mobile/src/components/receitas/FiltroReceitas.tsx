import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores } from '@/lib/theme';
import { Campo } from './Campo';
import { mascararData, mesAnterior, nomeMes, parseBR, proximoMes, formatarBR } from '@/features/receitas/dates';
import { MSG } from '@/features/receitas/validation';
import type { Filtro } from '@/features/receitas/types';

type Modo = Filtro['modo'];

interface Props {
  filtro: Filtro;
  onChange: (f: Filtro) => void;
}

export function FiltroReceitas({ filtro, onChange }: Props) {
  const [modo, setModo] = useState<Modo>(filtro.modo);
  const [data, setData] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function escolherModo(m: Modo) {
    setModo(m);
    setErro(null);
    if (m === 'mes') {
      const n = new Date();
      onChange({ modo: 'mes', ano: n.getFullYear(), mes: n.getMonth() + 1 });
    }
  }

  function aplicar() {
    if (modo === 'data') {
      const d = parseBR(data);
      if (!d) return setErro(MSG.dataInvalida);
      setErro(null);
      onChange({ modo: 'data', data: d });
      return;
    }
    const i = parseBR(de);
    const f = parseBR(ate);
    if (!i || !f) return setErro(MSG.dataInvalida);
    if (i > f) return setErro(MSG.periodoInvalido); // EX02: datas digitadas permanecem
    setErro(null);
    onChange({ modo: 'periodo', de: i, ate: f });
  }

  return (
    <View style={estilos.caixa}>
      <View style={estilos.segmentos}>
        {(['mes', 'data', 'periodo'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => escolherModo(m)}
            style={[estilos.segmento, modo === m && estilos.segmentoAtivo]}
            accessibilityRole="button"
          >
            <Text style={[estilos.segmentoTexto, modo === m && estilos.segmentoTextoAtivo]}>
              {m === 'mes' ? 'Mês' : m === 'data' ? 'Data' : 'Período'}
            </Text>
          </Pressable>
        ))}
      </View>

      {modo === 'mes' && filtro.modo === 'mes' ? (
        <View style={estilos.navMes}>
          <Pressable
            onPress={() => onChange({ modo: 'mes', ...mesAnterior(filtro.ano, filtro.mes) })}
            accessibilityLabel="Mês anterior"
            style={estilos.seta}
          >
            <Text style={estilos.setaTexto}>‹</Text>
          </Pressable>
          <Text style={estilos.mes}>{nomeMes(filtro.ano, filtro.mes)}</Text>
          <Pressable
            onPress={() => onChange({ modo: 'mes', ...proximoMes(filtro.ano, filtro.mes) })}
            accessibilityLabel="Próximo mês"
            style={estilos.seta}
          >
            <Text style={estilos.setaTexto}>›</Text>
          </Pressable>
        </View>
      ) : null}

      {modo === 'data' ? (
        <Campo rotulo="Data" value={data} onChangeText={(t) => setData(mascararData(t))} placeholder="DD/MM/AAAA" keyboardType="number-pad" />
      ) : null}

      {modo === 'periodo' ? (
        <>
          <Campo rotulo="De" value={de} onChangeText={(t) => setDe(mascararData(t))} placeholder="DD/MM/AAAA" keyboardType="number-pad" />
          <Campo rotulo="Até" value={ate} onChangeText={(t) => setAte(mascararData(t))} placeholder="DD/MM/AAAA" keyboardType="number-pad" />
        </>
      ) : null}

      {modo !== 'mes' ? (
        <>
          {erro ? (
            <Text style={estilos.erro} accessibilityRole="alert">
              {erro}
            </Text>
          ) : null}
          <Pressable onPress={aplicar} style={estilos.aplicar} accessibilityRole="button">
            <Text style={estilos.aplicarTexto}>Aplicar filtro</Text>
          </Pressable>
          {filtro.modo !== 'mes' ? (
            <Text style={estilos.ativo}>
              Exibindo: {filtro.modo === 'data' ? formatarBR(filtro.data) : `${formatarBR(filtro.de)} a ${formatarBR(filtro.ate)}`}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { marginBottom: 8 },
  segmentos: { flexDirection: 'row', backgroundColor: cores.claro, borderRadius: 12, padding: 3, marginBottom: 12 },
  segmento: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  segmentoAtivo: { backgroundColor: cores.primaria },
  segmentoTexto: { color: cores.marinho, fontWeight: '600' },
  segmentoTextoAtivo: { color: cores.branco },
  navMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  seta: { paddingHorizontal: 16, paddingVertical: 4 },
  setaTexto: { fontSize: 28, color: cores.primaria, fontWeight: '700' },
  mes: { fontSize: 17, fontWeight: '700', color: cores.marinho },
  erro: { color: cores.erro, fontSize: 13, marginBottom: 8 },
  aplicar: { backgroundColor: cores.primaria, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  aplicarTexto: { color: cores.branco, fontWeight: '700' },
  ativo: { fontSize: 13, color: cores.textoSuave, marginTop: 8 },
});
