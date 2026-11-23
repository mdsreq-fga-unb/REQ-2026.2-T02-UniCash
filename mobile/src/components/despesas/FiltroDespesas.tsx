
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

type Modo = 'dia' | 'mes' | 'personalizado';

function mesAtual() {
  const n = new Date();
  return { ano: n.getFullYear(), mes: n.getMonth() + 1 };
}

function rotuloDoFiltro(f: FiltroDespesa): string {
  if (f.modo === 'mes') return nomeMes(f.ano, f.mes);
  if (f.modo === 'data') return formatarBR(f.data);
  return `${formatarBR(f.de)} – ${formatarBR(f.ate)}`;
}

interface Props {
  filtro: FiltroDespesa;
  onChange: (f: FiltroDespesa) => void;
}

export function FiltroDespesas({ filtro, onChange }: Props) {
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
    } else {
      setModo('personalizado');
      setDe(formatarBR(filtro.de));
      setAte(formatarBR(filtro.ate));
    }

    setAberto(true);
  }

  function aplicar() {
    if (modo === 'mes') {
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
        accessibilityLabel="Filtrar despesas"
      >
        <Text style={estilos.chipIcone}>🗓</Text>
        <Text style={estilos.chipTexto}>{rotuloDoFiltro(filtro)}</Text>
        <Text style={estilos.chipSeta}>▾</Text>
      </Pressable>

      <Modal
        visible={aberto}
        transparent
        animationType="slide"
        onRequestClose={() => setAberto(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={estilos.fundo}
        >
          <View style={estilos.folha}>
            <Text style={estilos.titulo}>Filtrar despesas</Text>
            <Text style={estilos.secao}>Período</Text>

            <Segmentado
              valor={modo}
              onChange={(m) => {
                setModo(m);
                setErro(null);
              }}
              opcoes={[
                { valor: 'dia', rotulo: 'Dia' },
                { valor: 'mes', rotulo: 'Mês' },
                { valor: 'personalizado', rotulo: 'Personalizado' },
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
                <>
                  <Campo
                    rotulo="De"
                    value={de}
                    onChangeText={(t) => setDe(mascararData(t))}
                    placeholder="DD/MM/AAAA"
                    keyboardType="number-pad"
                  />
                  <Campo
                    rotulo="Até"
                    value={ate}
                    onChangeText={(t) => setAte(mascararData(t))}
                    placeholder="DD/MM/AAAA"
                    keyboardType="number-pad"
                  />
                </>
              ) : null}
            </View>

            {erro ? (
              <Text style={estilos.erro} accessibilityRole="alert">
                {erro}
              </Text>
            ) : null}

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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: cores.claro,
    borderRadius: raio.pilula,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: cores.branco,
  },
  chipIcone: { fontSize: 12, marginRight: 6 },
  chipTexto: { fontSize: 12, color: cores.marinho, fontWeight: '600' },
  chipSeta: { fontSize: 11, color: cores.primaria, marginLeft: 6 },
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(8,47,73,0.55)',
    justifyContent: 'flex-end',
  },
  folha: {
    backgroundColor: cores.branco,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.marinho,
    marginBottom: 14,
  },
  secao: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.marinho,
    marginBottom: 6,
  },
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
  botoes: { flexDirection: 'row', gap: 12, marginTop: 16 },
  limpar: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 13,
    alignItems: 'center',
  },
  limparTexto: { color: cores.primaria, fontWeight: '700' },
  aplicar: {
    flex: 2,
    backgroundColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 13,
    alignItems: 'center',
  },
  aplicarTexto: { color: cores.branco, fontWeight: '700' },
});
