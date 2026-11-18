import { useRef, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { Campo } from '@/components/receitas/Campo';
import { formatarBR, hojeISO, mascararData, parseBR } from '@/features/receitas/dates';
import { centavosParaTexto, parseValor } from '@/features/receitas/money';
import { excluirDespesa, salvarDespesa, salvarSaldoInicial, DespesaIndisponivel, type Despesa } from '@/features/saldo/service';

type Props = {
  modo: 'despesa' | 'inicial';
  inicio: string;
  valorInicial?: number;
  despesaEmEdicao?: Despesa;
  aoSalvar: () => void;
  aoCancelar: () => void;
};

export function FormularioSaldo({ modo, inicio, valorInicial, despesaEmEdicao, aoSalvar, aoCancelar }: Props) {
  const despesa = modo === 'despesa';
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [valor, setValor] = useState(() => valorInicial === undefined ? '' :
    `${valorInicial < 0 ? '-' : ''}${centavosParaTexto(Math.abs(valorInicial))}`);
  const [data, setData] = useState(() => {
    if (despesaEmEdicao) return formatarBR(despesaEmEdicao.data);
    const hoje = hojeISO();
    return formatarBR(hoje.startsWith(inicio.slice(0, 7)) ? hoje : inicio);
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const emAndamento = useRef(false);

  async function persistir(operacao: () => Promise<void>) {
    if (emAndamento.current) return;
    emAndamento.current = true;
    setSalvando(true);
    setErro('');
    try {
      await operacao();
      aoSalvar();
    } catch (falha) {
      setErro(falha instanceof DespesaIndisponivel
        ? 'Esta despesa já foi excluída.'
        : 'Não foi possível concluir a operação. Tente novamente.');
    } finally {
      emAndamento.current = false;
      setSalvando(false);
    }
  }

  async function salvar() {
    const texto = valor.trim();
    const negativo = !despesa && texto.startsWith('-');
    const magnitude = negativo ? texto.slice(1) : texto;
    const resultado = parseValor(magnitude);
    const zero = !despesa && /^0+(?:[,.]0{1,2})?$/.test(magnitude);
    if (!resultado.ok && !zero) {
      setErro('Informe um valor válido.');
      return;
    }

    const dataISO = parseBR(data);
    if (despesa && !dataISO) {
      setErro('Informe uma data válida.');
      return;
    }

    const centavos = resultado.ok ? resultado.centavos : 0;
    await persistir(() => despesa && dataISO
      ? salvarDespesa(dataISO, centavos, despesaEmEdicao?.id)
      : salvarSaldoInicial({ mes: inicio.slice(0, 7), centavos: negativo ? -centavos : centavos }));
  }

  if (confirmandoExclusao && despesaEmEdicao) {
    return (
      <View>
        <Text>Excluir esta despesa?</Text>
        {erro ? <Text accessibilityRole="alert">{erro}</Text> : null}
        <Button title="Excluir despesa" onPress={() => void persistir(() => excluirDespesa(despesaEmEdicao.id))} disabled={salvando} />
        <Button title="Voltar para edição" onPress={() => { setConfirmandoExclusao(false); setErro(''); }} disabled={salvando} />
      </View>
    );
  }

  return (
    <View>
      <Campo
        rotulo={despesa ? 'Valor da despesa' : 'Saldo inicial do mês selecionado'}
        prefixo="R$"
        keyboardType={despesa ? 'decimal-pad' : 'numbers-and-punctuation'}
        editable={!salvando}
        value={valor}
        onChangeText={setValor}
      />
      {despesa && (
        <Campo rotulo="Data da despesa" value={data} onChangeText={(texto) => setData(mascararData(texto))}
          keyboardType="number-pad" editable={!salvando} />
      )}
      {erro ? <Text accessibilityRole="alert">{erro}</Text> : null}
      <Button title="Salvar" onPress={() => void salvar()} disabled={salvando} />
      {despesaEmEdicao && (
        <Button title="Excluir" onPress={() => { setConfirmandoExclusao(true); setErro(''); }} disabled={salvando} />
      )}
      <Button title="Cancelar" onPress={aoCancelar} disabled={salvando} />
    </View>
  );
}
