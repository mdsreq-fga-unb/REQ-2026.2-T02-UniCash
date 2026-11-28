
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconePrototipo } from '@/components/IconePrototipo';
import { cores, raio } from '@/lib/theme';
import { Campo } from '../receitas/Campo';
import { Segmentado } from '../receitas/Segmentado';
import {
  formatarBR,
  mascararData,
  mesAnterior,
  nomeMes,
  parseBR,
  proximoMes,
} from '@/features/receitas/dates';
import { MSG_DESPESA } from '@/features/despesas/validation';
import type { FiltroDespesa } from '@/features/despesas/types';

type Modo = 'dia' | 'mes' | 'personalizado' | 'tudo';

function mesAtual() {
  const n = new Date();
  return { ano: n.getFullYear(), mes: n.getMonth() + 1 };
}

function rotuloDoFiltro(f: FiltroDespesa): string {
  if (f.modo === 'tudo') return 'Todo o período';
  if (f.modo === 'mes') return nomeMes(f.ano, f.mes);
  if (f.modo === 'data') return formatarBR(f.data);
  return `${formatarBR(f.de)} – ${formatarBR(f.ate)}`;
}

interface Props {
  filtro: FiltroDespesa;
  onChange: (f: FiltroDespesa) => void;
  titulo?: string;
}

export function FiltroDespesas({ filtro, onChange, titulo = 'Filtrar despesas' }: Props) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<Modo>('mes');
  const [mes, setMes] = useState(mesAtual());
  const [dia, setDia] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function abrir() {
    setErro(null);

    if (filtro.modo === 'mes') {
      setModo('mes');
      setMes({ ano: filtro.ano, mes: filtro.mes });
    } else if (filtro.modo === 'data') {
      setModo('dia');
      setDia(formatarBR(filtro.data));
    } else if (filtro.modo === 'tudo') {
      setModo('tudo');
    } else {
      setModo('personalizado');
      setDe(formatarBR(filtro.de));
      setAte(formatarBR(filtro.ate));
    }

    setAberto(true);
  }

  function aplicar() {
    if (modo === 'tudo') {
      onChange({ modo: 'tudo' });
    } else if (modo === 'mes') {
      onChange({ modo: 'mes', ...mes });
    } else if (modo === 'dia') {
      const d = parseBR(dia);
      if (!d) return setErro(MSG_DESPESA.dataInvalida);
      onChange({ modo: 'data', data: d });
    } else {
      const i = parseBR(de);
      const f = parseBR(ate);

      if (!i || !f) return setErro(MSG_DESPESA.dataInvalida);
      if (i > f) return setErro(MSG_DESPESA.periodoInvalido);

      onChange({ modo: 'periodo', de: i, ate: f });
    }

    setErro(null);
    setAberto(false);
  }

  function limpar() {
    setErro(null);
    onChange({ modo: 'mes', ...mesAtual() });
    setAberto(false);
  }

  return (
    <>
      <Pressable
        onPress={abrir}
        style={estilos.chip}
        accessibilityRole="button"
        accessibilityLabel={titulo}
      >
        <IconePrototipo nome="calendario" tamanho={12} />
        <Text style={estilos.chipTexto}>{rotuloDoFiltro(filtro)}</Text>
        <IconePrototipo nome="expandir" tamanho={10} />
      </Pressable>

      <Modal
        visible={aberto}
        animationType="slide"
        onRequestClose={() => setAberto(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={estilos.fundo}
        >
          <SafeAreaView style={estilos.folha}>
            <View style={estilos.cabecalho}>
              <Pressable accessibilityRole="button" accessibilityLabel="Voltar"
                onPress={() => setAberto(false)} style={estilos.voltar}>
                <IconePrototipo nome="voltar" tamanho={14} />
              </Pressable>
              <Text accessibilityRole="header" style={estilos.titulo}>{titulo}</Text>
            </View>
            <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
              <Text style={estilos.secao}>Período</Text>

              <Segmentado
                variante="pilulas"
                valor={modo}
                onChange={(m) => {
                  setModo(m);
                  setErro(null);
                }}
                opcoes={[
                  { valor: 'dia', rotulo: 'Dia' },
                  { valor: 'mes', rotulo: 'Mês' },
                  { valor: 'personalizado', rotulo: 'Personalizado' },
                  { valor: 'tudo', rotulo: 'Tudo' },
                ]}
              />

              <View style={{ marginTop: 16 }}>
                {modo === 'mes' ? (
                  <View style={estilos.navMes}>
                    <Pressable
                      onPress={() => setMes((m) => mesAnterior(m.ano, m.mes))}
                      accessibilityLabel="Mês anterior"
                      style={estilos.setaNav}
                    >
                      <Text style={estilos.setaNavTexto}>‹</Text>
                    </Pressable>

                    <Text style={estilos.mes}>
                      {nomeMes(mes.ano, mes.mes)}
                    </Text>

                    <Pressable
                      onPress={() => setMes((m) => proximoMes(m.ano, m.mes))}
                      accessibilityLabel="Próximo mês"
                      style={estilos.setaNav}
                    >
                      <Text style={estilos.setaNavTexto}>›</Text>
                    </Pressable>
                  </View>
                ) : null}

                {modo === 'tudo' ? (
                  <Text style={estilos.tudoTexto}>Mostra os registros de qualquer data.</Text>
                ) : null}
                {modo === 'dia' ? (
                  <Campo
                    rotulo="Data"
                    value={dia}
                    onChangeText={(t) => setDia(mascararData(t))}
                    placeholder="DD/MM/AAAA"
                    keyboardType="number-pad"
                  />
                ) : null}

                {modo === 'personalizado' ? (
                  <View style={estilos.datas}>
                    <View style={estilos.data}>
                      <Campo
                        compacto
                        rotulo="De"
                        value={de}
                        onChangeText={(t) => setDe(mascararData(t))}
                        placeholder="DD/MM/AAAA"
                        keyboardType="number-pad"
                        acao={<IconePrototipo nome="calendario" tamanho={14} />}
                      />
                    </View>
                    <View style={estilos.data}>
                      <Campo
                        compacto
                        rotulo="Até"
                        value={ate}
                        onChangeText={(t) => setAte(mascararData(t))}
                        placeholder="DD/MM/AAAA"
                        keyboardType="number-pad"
                        acao={<IconePrototipo nome="calendario" tamanho={14} />}
                      />
                    </View>
                  </View>
                ) : null}
              </View>

              {erro ? (
                <Text style={estilos.erro} accessibilityRole="alert">
                  {erro}
                </Text>
              ) : null}
            </ScrollView>
            <View style={estilos.botoes}>
              <Pressable
                onPress={limpar}
                style={estilos.limpar}
                accessibilityRole="button"
              >
                <Text style={estilos.limparTexto}>Limpar</Text>
              </Pressable>

              <Pressable
                onPress={aplicar}
                style={estilos.aplicar}
                accessibilityRole="button"
              >
                <Text style={estilos.aplicarTexto}>Aplicar filtros</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  tudoTexto: { fontSize: 14, color: cores.textoSuave, textAlign: 'center', paddingVertical: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: cores.claro,
    borderRadius: raio.pilula,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: cores.branco,
  },
  chipTexto: { flexShrink: 1, fontSize: 12, color: cores.marinho, fontWeight: '600' },
  fundo: { flex: 1 },
  folha: { flex: 1, backgroundColor: cores.branco },
  cabecalho: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16, gap: 10 },
  voltar: { width: 28, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontSize: 18, fontWeight: '600', color: cores.marinho },
  conteudo: { paddingHorizontal: 16, paddingVertical: 8 },
  secao: { fontSize: 16, fontWeight: '600', color: cores.marinho, marginBottom: 16 },
  datas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  data: { flexGrow: 1, flexBasis: 145 },
  navMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setaNav: { paddingHorizontal: 16 },
  setaNavTexto: {
    fontSize: 28,
    color: cores.primaria,
    fontWeight: '700',
  },
  mes: { fontSize: 16, fontWeight: '700', color: cores.marinho },
  erro: { color: cores.erro, fontSize: 12, marginTop: 4 },
  botoes: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: cores.borda },
  limpar: {
    flex: 1,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  limparTexto: { color: cores.marinho, fontWeight: '700' },
  aplicar: {
    flex: 1,
    backgroundColor: cores.primaria,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  aplicarTexto: { color: cores.branco, fontWeight: '700' },
});
