import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cores, raio } from '@/lib/theme';
import { Campo } from '../receitas/Campo';
import { Segmentado } from '../receitas/Segmentado';
import { centavosParaTexto } from '@/features/receitas/money';
import { centesimosParaTextoPercentual } from '@/features/categorias/formato';
import { validarFormularioCategoria, type ErrosCategoriaForm } from '@/features/categorias/validation';
import type { CategoriaInput, LimiteTipo } from '@/features/categorias/types';

/** Os três estados do limite (RF67): ausente, valor fixo em reais ou % da renda. */
type FormaLimite = 'sem' | LimiteTipo;

interface EstadoForm {
  nome: string;
  forma: FormaLimite;
  /** Texto do campo de valor em reais (armazenado em centavos). */
  limiteValor: string;
  /** Texto do campo de percentual (armazenado em centésimos). */
  limitePercentual: string;
}

/** Texto editável do percentual (sem o símbolo %): 1250 → "12,5". */
const textoPercentualEdicao = (centesimos: number) => centesimosParaTextoPercentual(centesimos).replace('%', '');

function valoresIniciais(inicial?: CategoriaInput): EstadoForm {
  return {
    nome: inicial?.nome ?? '',
    forma: inicial?.limite?.tipo ?? 'sem',
    limiteValor: inicial?.limite?.tipo === 'valor' ? centavosParaTexto(inicial.limite.valor) : '',
    limitePercentual:
      inicial?.limite?.tipo === 'percentual_renda' ? textoPercentualEdicao(inicial.limite.valor) : '',
  };
}

export interface CategoriaFormProps {
  titulo: string;
  textoSalvar: string;
  /** Dados iniciais (edição); ausente = cadastro. */
  inicial?: CategoriaInput;
  /** Categoria padrão (RN13): nome exibido, porém não editável. */
  padrao?: boolean;
  salvando: boolean;
  erroGeral?: string | null;
  /** Erro no campo nome vindo da tela (ex.: NomeDuplicado). Toma precedência sobre o erro local. */
  erroNomeExterno?: string | null;
  /** Avisada a cada edição do nome, para a tela limpar erros externos antigos. */
  onNomeAlterado?: () => void;
  /** Chamado apenas com dados validados (CategoriaInput); nada é gravado sem eles (EX01). */
  onSalvar: (dados: CategoriaInput) => void;
  onCancelar: () => void;
}

/**
 * Formulário único para cadastrar e editar categorias (B e C do UC06),
 * espelhando ReceitaForm. A validação usa validarFormularioCategoria;
 * a unicidade do nome fica com a tela/serviço, não aqui.
 */
export function CategoriaForm({
  titulo,
  textoSalvar,
  inicial,
  padrao = false,
  salvando,
  erroGeral,
  erroNomeExterno,
  onNomeAlterado,
  onSalvar,
  onCancelar,
}: CategoriaFormProps) {
  const [v, setV] = useState<EstadoForm>(() => valoresIniciais(inicial));
  const [erros, setErros] = useState<ErrosCategoriaForm>({});
  const set = <K extends keyof EstadoForm>(k: K, valor: EstadoForm[K]) => setV((p) => ({ ...p, [k]: valor }));

  /**
   * Envio duplicado (defesa imediata): a prop `salvando` só chega na próxima
   * renderização, então dois toques rápidos escapariam dela. `enviando` bloqueia
   * no mesmo ciclo e é liberado quando a tela encerra o salvamento
   * (`salvando` volta a false — sucesso ou falha), permitindo nova tentativa.
   */
  const enviando = useRef(false);
  useEffect(() => {
    if (!salvando) enviando.current = false;
  }, [salvando]);

  function salvar() {
    if (salvando || enviando.current) return;
    const valores = {
      nome: v.nome,
      comLimite: v.forma !== 'sem',
      limiteTipo: v.forma === 'percentual_renda' ? ('percentual_renda' as const) : ('valor' as const),
      limiteValor: v.limiteValor,
      limitePercentual: v.limitePercentual,
    };
    const { erros: e, dados } = validarFormularioCategoria(valores);
    setErros(e);
    if (dados) {
      enviando.current = true;
      onSalvar(dados); // valores permanecem preenchidos mesmo com erros
    }
  }

  const erroNome = erroNomeExterno ?? erros.nome;

  return (
    <View style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <Pressable
          onPress={onCancelar}
          disabled={salvando}
          accessibilityLabel="Voltar"
          accessibilityState={{ disabled: salvando }}
          style={[estilos.voltar, salvando && { opacity: 0.6 }]}
        >
          <Text style={estilos.voltarTexto}>‹</Text>
        </Pressable>
        <Text style={estilos.titulo}>{titulo}</Text>
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Campo
          rotulo="Nome"
          value={v.nome}
          onChangeText={(t) => {
            set('nome', t);
            onNomeAlterado?.();
          }}
          placeholder="Ex.: Mercado, Lazer"
          editable={!padrao}
          erro={erroNome ?? undefined}
          abaixo={
            padrao ? (
              <Text style={estilos.dicaPadrao}>Categorias padrão não podem ser renomeadas nem excluídas.</Text>
            ) : undefined
          }
        />

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Limite de gastos (opcional)</Text>
          <Segmentado<FormaLimite>
            valor={v.forma}
            onChange={(f) => set('forma', f)}
            opcoes={[
              { valor: 'sem', rotulo: 'Sem limite' },
              { valor: 'valor', rotulo: 'Valor fixo' },
              { valor: 'percentual_renda', rotulo: '% da renda' },
            ]}
          />
        </View>

        {v.forma === 'valor' ? (
          <Campo
            rotulo="Valor"
            prefixo="R$"
            value={v.limiteValor}
            onChangeText={(t) => set('limiteValor', t)}
            placeholder="0,00"
            keyboardType="decimal-pad"
            erro={erros.limiteValor}
          />
        ) : null}

        {v.forma === 'percentual_renda' ? (
          <Campo
            rotulo="Percentual da renda"
            value={v.limitePercentual}
            onChangeText={(t) => set('limitePercentual', t)}
            placeholder="Ex.: 12,5"
            keyboardType="decimal-pad"
            erro={erros.limitePercentual}
            abaixo={<Text style={estilos.dica}>Percentual da sua renda mensal, com até duas casas decimais.</Text>}
            acao={<Text style={estilos.sufixo}>%</Text>}
          />
        ) : null}

        <Text style={estilos.dica}>Salvo primeiro no dispositivo: funciona sem internet.</Text>
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
          style={[estilos.salvar, salvando && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={textoSalvar}
        >
          {salvando ? <ActivityIndicator color={cores.branco} /> : <Text style={estilos.salvarTexto}>{textoSalvar}</Text>}
        </Pressable>
        <Pressable onPress={onCancelar} disabled={salvando} style={estilos.secundario} accessibilityRole="button">
          <Text style={estilos.secundarioTexto}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  voltar: { paddingHorizontal: 10 },
  voltarTexto: { fontSize: 30, color: cores.primaria, fontWeight: '700', lineHeight: 32 },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.marinho },
  conteudo: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  bloco: { marginBottom: 14 },
  rotulo: { fontSize: 13, fontWeight: '600', color: cores.marinho, marginBottom: 6 },
  sufixo: { fontSize: 15, color: cores.textoSuave, marginLeft: 8 },
  dica: { fontSize: 12, color: cores.primaria, marginTop: 6 },
  dicaPadrao: { fontSize: 12, color: cores.textoSuave, marginTop: 6 },
  erroGeral: { color: cores.erro, fontSize: 14, fontWeight: '600', marginTop: 12 },
  rodape: { padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: cores.borda },
  salvar: { backgroundColor: cores.primaria, borderRadius: raio.botao, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  salvarTexto: { color: cores.branco, fontWeight: '700', fontSize: 15 },
  secundario: { alignItems: 'center', paddingVertical: 14 },
  secundarioTexto: { color: cores.primaria, fontWeight: '600', fontSize: 14 },
});
