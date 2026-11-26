import { useRef, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { Campo } from '@/components/receitas/Campo';
import { centavosParaTexto, parseValor } from '@/features/receitas/money';
import { salvarSaldoInicial } from '@/features/saldo/service';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';

type Props = {
  inicio: string;
  valorInicial?: number;
  aoSalvar: () => void;
  aoCancelar: () => void;
};

export function FormularioSaldo({ inicio, valorInicial, aoSalvar, aoCancelar }: Props) {
  const [valor, setValor] = useState(() => valorInicial === undefined ? '' :
    `${valorInicial < 0 ? '-' : ''}${centavosParaTexto(Math.abs(valorInicial))}`);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const emAndamento = useRef(false);

  async function salvar() {
    if (emAndamento.current) return;
    const texto = valor.trim();
    const negativo = texto.startsWith('-');
    const magnitude = negativo ? texto.slice(1) : texto;
    const resultado = parseValor(magnitude);
    if (!resultado.ok && !/^0+(?:[,.]0{1,2})?$/.test(magnitude)) {
      setErro('Informe um valor válido.');
      return;
    }

    const centavos = resultado.ok ? resultado.centavos : 0;
    emAndamento.current = true;
    setSalvando(true);
    setErro('');
    try {
      await salvarSaldoInicial({ mes: inicio.slice(0, 7), centavos: negativo ? -centavos : centavos });
      aoSalvar();
      sincronizarEmSegundoPlano(true);
    } catch {
      setErro('Não foi possível salvar o saldo inicial. Tente novamente.');
    } finally {
      emAndamento.current = false;
      setSalvando(false);
    }
  }

  return (
    <View>
      <Campo rotulo="Saldo inicial do mês selecionado" prefixo="R$" keyboardType="numbers-and-punctuation"
        editable={!salvando} value={valor} onChangeText={setValor} />
      {erro ? <Text accessibilityRole="alert">{erro}</Text> : null}
      <Button title="Salvar" onPress={() => void salvar()} disabled={salvando} />
      <Button title="Cancelar" onPress={aoCancelar} disabled={salvando} />
    </View>
  );
}
