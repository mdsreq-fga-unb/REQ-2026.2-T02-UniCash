
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { cores, raio } from '@/lib/theme';
import { Campo } from '../receitas/Campo';
import { Segmentado } from '../receitas/Segmentado';
import {
  hojeISO,
  formatarBR,
  mascararData,
} from '@/features/receitas/dates';
import {
  validarFormularioDespesa,
  type ErrosFormDespesa,
} from '@/features/despesas/validation';
import type {
  DespesaInput,
  FormValoresDespesa,
  UnidadeRecorrencia,
} from '@/features/despesas/types';

export const FORM_DESPESA_VAZIO: FormValoresDespesa = {
  valor: '',
  data: formatarBR(hojeISO()),
  titulo: '',
  descricao: '',
  categoriaId: '',
  fixaOuVariavel: '',
  essencial: '',
  recorrente: false,
  intervalo: '1',
  unidade: 'mes',
  termino: '',
};

interface Props {
  titulo: string;
  textoSalvar: string;
  inicial?: FormValoresDespesa;
  emSerie?: boolean;
  salvando: boolean;
  erroGeral?: string | null;
  onSalvar: (dados: DespesaInput) => void;
  onCancelar: () => void;
  onExcluir?: () => void;
}

const UNIDADES: {
  valor: UnidadeRecorrencia;
  rotulo: string;
  um: string;
  varios: string;
}[] = [
  { valor: 'dia', rotulo: 'Dias', um: 'dia', varios: 'dias' },
  { valor: 'mes', rotulo: 'Meses', um: 'mês', varios: 'meses' },
  { valor: 'ano', rotulo: 'Anos', um: 'ano', varios: 'anos' },
];

function resumoRepeticao(v: FormValoresDespesa): string {
  if (!v.recorrente) return 'Não se repete';

  const n = Number(v.intervalo) || 0;
  const unidade = UNIDADES.find((x) => x.valor === v.unidade)!;
  const base = `A cada ${v.intervalo || '?'} ${n === 1 ? unidade.um : unidade.varios}`;

  return v.termino ? `${base} · até ${v.termino}` : base;
}

export function DespesaForm({
  titulo,
  textoSalvar,
  inicial,
  emSerie,
  salvando,
  erroGeral,
  onSalvar,
  onCancelar,
  onExcluir,
}: Props) {
  const [v, setV] = useState<FormValoresDespesa>(
    inicial ?? FORM_DESPESA_VAZIO,
  );
  const [erros, setErros] = useState<ErrosFormDespesa>({});
  const [repeticaoAberta, setRepeticaoAberta] = useState(false);

  function set<K extends keyof FormValoresDespesa>(
    campo: K,
    valor: FormValoresDespesa[K],
  ) {
    setV((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function salvar() {
    const resultado = validarFormularioDespesa(v, {
      permitirRecorrencia: true,
    });

    setErros(resultado.erros);

    if (resultado.dados) {
      onSalvar(resultado.dados);
    }
  }

  const erroRepeticao = erros.intervalo ?? erros.termino;

  return (
    <View style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <Pressable
          onPress={onCancelar}
          accessibilityLabel="Voltar"
          style={estilos.voltar}
        >
          <Text style={estilos.voltarTexto}>‹</Text>
        </Pressable>

        <Text style={estilos.titulo}>{titulo}</Text>
      </View>

      <ScrollView
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 16 }}>
          <Segmentado
            valor="despesa"
            opcoes={[
              { valor: 'despesa', rotulo: 'Despesa' },
              { valor: 'receita', rotulo: 'Receita', inerte: true },
            ]}
          />
        </View>

        <Campo
          rotulo="Título"
          value={v.titulo}
          onChangeText={(texto) => set('titulo', texto)}
          placeholder="Ex.: Conta de energia"
          erro={erros.titulo}
        />

        <Campo
          rotulo="Valor"
          prefixo="R$"
          value={v.valor}
          onChangeText={(texto) => set('valor', texto)}
          placeholder="0,00"
          keyboardType="decimal-pad"
          erro={erros.valor}
        />

        <Campo
          rotulo="Data"
          value={v.data}
          onChangeText={(texto) => set('data', mascararData(texto))}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          erro={erros.data}
          acao={<Text style={estilos.icone}>🗓</Text>}
          abaixo={
            <Pressable
              onPress={() => set('data', formatarBR(hojeISO()))}
              accessibilityRole="button"
              style={estilos.hojeBotao}
            >
              <Text style={estilos.hoje}>Hoje</Text>
            </Pressable>
          }
        />

        <Campo
          rotulo="Descrição (opcional)"
          value={v.descricao}
          onChangeText={(texto) => set('descricao', texto)}
          placeholder="Detalhes da despesa"
          multiline
          erro={erros.descricao}
        />

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Tipo de despesa</Text>
          <Segmentado
            valor={v.fixaOuVariavel}
            onChange={(valor) =>
              set('fixaOuVariavel', valor as FormValoresDespesa['fixaOuVariavel'])
            }
            opcoes={[
              { valor: 'fixa', rotulo: 'Fixa' },
              { valor: 'variavel', rotulo: 'Variável' },
            ]}
          />
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Importância</Text>
          <Segmentado
            valor={v.essencial}
            onChange={(valor) =>
              set('essencial', valor as FormValoresDespesa['essencial'])
            }
            opcoes={[
              { valor: 'essencial', rotulo: 'Essencial' },
              { valor: 'nao_essencial', rotulo: 'Não essencial' },
            ]}
          />
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Categoria</Text>
          <View style={estilos.categoria}>
            <Text style={estilos.categoriaTexto}>
              Sem categoria
            </Text>
          </View>
          <Text style={estilos.dica}>
            A seleção de categorias será integrada ao gerenciamento de categorias.
          </Text>
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Repetição (opcional)</Text>

          <Pressable
            onPress={() => setRepeticaoAberta(true)}
            style={[
              estilos.seletor,
              erroRepeticao ? estilos.seletorErro : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Repetição"
          >
            <Text style={estilos.seletorTexto}>
              {resumoRepeticao(v)}
            </Text>
            <Text style={estilos.seta}>▾</Text>
          </Pressable>

          {erroRepeticao ? (
            <Text style={estilos.erro} accessibilityRole="alert">
              {erroRepeticao}
            </Text>
          ) : (
            <Text style={estilos.dica}>
              Opcional · Dias, meses ou anos
            </Text>
          )}

          {emSerie ? (
            <Text style={estilos.dica}>
              Despesa de uma série: mudanças na repetição podem valer para esta,
              as próximas ou todas as ocorrências.
            </Text>
          ) : null}
        </View>

        <Text style={estilos.dica}>
          Salvo primeiro no dispositivo: funciona sem internet.
        </Text>

        {erroGeral ? (
          <Text style={estilos.erroGeral} accessibilityRole="alert">
            {erroGeral}
          </Text>
        ) : null}
      </ScrollView>

      <View style={estilos.rodape}>
        <Pressable
          onPress={salvar}
          disabled={salvando}
          style={[
            estilos.salvar,
            salvando && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
        >
          {salvando ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <Text style={estilos.salvarTexto}>{textoSalvar}</Text>
          )}
        </Pressable>

        {onExcluir ? (
          <Pressable
            onPress={onExcluir}
            disabled={salvando}
            style={estilos.secundario}
            accessibilityRole="button"
          >
            <Text style={estilos.secundarioTexto}>
              🗑 Excluir despesa
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onCancelar}
            disabled={salvando}
            style={estilos.secundario}
            accessibilityRole="button"
          >
            <Text style={estilos.secundarioTexto}>Cancelar</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={repeticaoAberta}
        transparent
        animationType="slide"
        onRequestClose={() => setRepeticaoAberta(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={estilos.modalFundo}
        >
          <View style={estilos.modalCartao}>
            <Text style={estilos.modalTitulo}>Repetição</Text>

            <Segmentado
              valor={v.recorrente ? 'sim' : 'nao'}
              onChange={(valor) => set('recorrente', valor === 'sim')}
              opcoes={[
                { valor: 'nao', rotulo: 'Não se repete' },
                { valor: 'sim', rotulo: 'Repete' },
              ]}
            />

            {v.recorrente ? (
              <View style={{ marginTop: 16 }}>
                <Campo
                  rotulo="Repetir a cada"
                  value={v.intervalo}
                  onChangeText={(texto) =>
                    set('intervalo', texto.replace(/\D/g, ''))
                  }
                  keyboardType="number-pad"
                  erro={erros.intervalo}
                />

                <View style={{ marginBottom: 14 }}>
                  <Segmentado
                    valor={v.unidade}
                    onChange={(unidade) =>
                      set('unidade', unidade as UnidadeRecorrencia)
                    }
                    opcoes={UNIDADES.map((unidade) => ({
                      valor: unidade.valor,
                      rotulo: unidade.rotulo,
                    }))}
                  />
                </View>

                <Campo
                  rotulo="Data de término (opcional)"
                  value={v.termino}
                  onChangeText={(texto) =>
                    set('termino', mascararData(texto))
                  }
                  placeholder="DD/MM/AAAA"
                  keyboardType="number-pad"
                  erro={erros.termino}
                />
              </View>
            ) : null}

            <Pressable
              onPress={() => setRepeticaoAberta(false)}
              style={estilos.salvar}
              accessibilityRole="button"
            >
              <Text style={estilos.salvarTexto}>Concluir</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  voltar: { paddingHorizontal: 10 },
  voltarTexto: {
    fontSize: 30,
    color: cores.primaria,
    fontWeight: '700',
    lineHeight: 32,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.marinho },
  conteudo: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  icone: { fontSize: 16, marginLeft: 8 },
  hojeBotao: { alignSelf: 'flex-start', paddingTop: 6 },
  hoje: { color: cores.primaria, fontSize: 12, fontWeight: '600' },
  bloco: { marginBottom: 14 },
  rotulo: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.marinho,
    marginBottom: 6,
  },
  categoria: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.campo,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: cores.branco,
  },
  categoriaTexto: { fontSize: 15, color: cores.textoSuave },
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.campo,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: cores.branco,
  },
  seletorErro: { borderColor: cores.erro },
  seletorTexto: { fontSize: 15, color: cores.marinho },
  seta: { fontSize: 14, color: cores.primaria },
  dica: { fontSize: 12, color: cores.primaria, marginTop: 6 },
  erro: { color: cores.erro, fontSize: 12, marginTop: 4 },
  erroGeral: {
    color: cores.erro,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  rodape: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  salvar: {
    backgroundColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  salvarTexto: {
    color: cores.branco,
    fontWeight: '700',
    fontSize: 15,
  },
  secundario: { alignItems: 'center', paddingVertical: 14 },
  secundarioTexto: {
    color: cores.primaria,
    fontWeight: '600',
    fontSize: 14,
  },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(8,47,73,0.55)',
    justifyContent: 'flex-end',
  },
  modalCartao: {
    backgroundColor: cores.branco,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.marinho,
    marginBottom: 14,
  },
});
