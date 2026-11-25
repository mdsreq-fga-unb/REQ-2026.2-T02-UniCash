
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Campo } from '@/components/receitas/Campo';
import { cores, raio } from '@/lib/theme';

import type { SaldoInicial } from '@/features/saldoInicial/repository';
import {
  validarSaldoInicial,
  type DadosSaldoInicial,
} from '@/features/saldoInicial/validation';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

interface Props {
  saldo: SaldoInicial | null;
  salvando: boolean;
  erro: string | null;
  sucesso: string | null;
  onSalvar: (dados: DadosSaldoInicial) => Promise<boolean>;
  onCancelar: () => void;
}

function formatarValor(centavos: number): string {
  const absoluto = Math.abs(centavos);
  const reais = Math.floor(absoluto / 100);
  const decimal = String(absoluto % 100).padStart(2, '0');

  return `${centavos < 0 ? '-' : ''}${reais},${decimal}`;
}

function converterCentavos(valor: string): number {
  const texto = valor.trim();

  if (!/^-?\d+(,\d{1,2})?$/.test(texto)) {
    return NaN;
  }

  const negativo = texto.startsWith('-');
  const [reais, decimal = ''] = texto
    .replace(/^-/, '')
    .split(',');

  const centavos = Number(
    reais + decimal.padEnd(2, '0'),
  );

  return negativo ? -centavos : centavos;
}

export function SaldoInicialForm({
  saldo,
  salvando,
  erro,
  sucesso,
  onSalvar,
  onCancelar,
}: Props) {
  const [valor, setValor] = useState(
    saldo ? formatarValor(saldo.valor_centavos) : '',
  );

  const [mes, setMes] = useState(
    saldo
      ? saldo.mes_referencia.slice(5, 7)
      : '',
  );

  const [ano, setAno] = useState(
    saldo
      ? saldo.mes_referencia.slice(0, 4)
      : String(new Date().getFullYear()),
  );

  const [erroLocal, setErroLocal] = useState<string | null>(
    null,
  );

  async function salvar() {
    if (salvando) return;

    setErroLocal(null);

    const dados: DadosSaldoInicial = {
      valorCentavos: converterCentavos(valor),
      mesReferencia: mes && ano ? `${ano}-${mes}` : '',
    };

    const erroValidacao = validarSaldoInicial(dados);

    if (erroValidacao) {
      setErroLocal(erroValidacao);
      return;
    }

    await onSalvar(dados);
  }

  return (
    <ScrollView
      contentContainerStyle={estilos.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={estilos.titulo}>Saldo inicial</Text>

      <Text style={estilos.descricao}>
        Informe o saldo que você possuía antes das
        movimentações do mês de referência.
      </Text>

      {saldo ? (
        <View style={estilos.resumo}>
          <Text style={estilos.rotulo}>
            Saldo inicial cadastrado
          </Text>

          <Text style={estilos.valorAtual}>
            R$ {formatarValor(saldo.valor_centavos)}
          </Text>

          <Text style={estilos.descricao}>
            Referência: {saldo.mes_referencia}
          </Text>

          <Text style={estilos.descricao}>
            {saldo.sync_status === 'pendente'
              ? 'Sincronização pendente'
              : 'Sincronizado'}
          </Text>
        </View>
      ) : (
        <Text style={estilos.descricao}>
          Nenhum saldo inicial cadastrado.
        </Text>
      )}

      <Campo
        rotulo="Valor do saldo inicial"
        prefixo="R$"
        placeholder="0,00"
        value={valor}
        onChangeText={setValor}
        keyboardType="default"
        editable={!salvando}
        autoCorrect={false}
      />

      <Text style={estilos.descricao}>
        Valores positivos, negativos e zero são permitidos.
        Exemplo: -150,50.
      </Text>

      <Text style={estilos.rotulo}>
        Mês de referência
      </Text>

      <View style={estilos.meses}>
        {MESES.map((nome, indice) => {
          const numero = String(indice + 1).padStart(2, '0');
          const selecionado = mes === numero;

          return (
            <Pressable
              key={numero}
              accessibilityRole="button"
              accessibilityState={{
                selected: selecionado,
                disabled: salvando,
              }}
              disabled={salvando}
              onPress={() => setMes(numero)}
              style={[
                estilos.mes,
                selecionado && estilos.mesSelecionado,
              ]}
            >
              <Text
                style={[
                  estilos.mesTexto,
                  selecionado && estilos.mesTextoSelecionado,
                ]}
              >
                {nome}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Campo
        rotulo="Ano de referência"
        placeholder="AAAA"
        value={ano}
        onChangeText={setAno}
        keyboardType="number-pad"
        maxLength={4}
        editable={!salvando}
      />

      {erroLocal || erro ? (
        <Text
          style={estilos.erro}
          accessibilityRole="alert"
        >
          {erroLocal || erro}
        </Text>
      ) : null}

      {sucesso && !erroLocal && !erro ? (
        <Text
          style={estilos.sucesso}
          accessibilityRole="alert"
        >
          {sucesso}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: salvando }}
        disabled={salvando}
        onPress={() => void salvar()}
        style={[
          estilos.botaoSalvar,
          salvando && estilos.desabilitado,
        ]}
      >
        {salvando ? (
          <ActivityIndicator color={cores.branco} />
        ) : (
          <Text style={estilos.botaoSalvarTexto}>
            Salvar saldo inicial
          </Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={salvando}
        onPress={onCancelar}
        style={estilos.botaoCancelar}
      >
        <Text style={estilos.botaoCancelarTexto}>
          Voltar
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '700',
    color: cores.marinho,
  },
  descricao: {
    fontSize: 14,
    color: cores.textoSuave,
    lineHeight: 21,
  },
  resumo: {
    backgroundColor: cores.branco,
    padding: 16,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.campo,
    gap: 6,
  },
  rotulo: {
    fontSize: 14,
    fontWeight: '600',
    color: cores.marinho,
  },
  valorAtual: {
    fontSize: 24,
    fontWeight: '700',
    color: cores.marinho,
  },
  meses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mes: {
    width: '30%',
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.campo,
    backgroundColor: cores.branco,
  },
  mesSelecionado: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  mesTexto: {
    fontSize: 13,
    color: cores.marinho,
  },
  mesTextoSelecionado: {
    color: cores.branco,
    fontWeight: '700',
  },
  erro: {
    color: cores.erro,
    fontSize: 14,
  },
  sucesso: {
    color: cores.marinho,
    fontSize: 14,
    fontWeight: '600',
  },
  botaoSalvar: {
    backgroundColor: cores.primaria,
    borderRadius: raio.botao,
    padding: 14,
    alignItems: 'center',
  },
  botaoSalvarTexto: {
    color: cores.branco,
    fontWeight: '700',
    fontSize: 15,
  },
  botaoCancelar: {
    padding: 12,
    alignItems: 'center',
  },
  botaoCancelarTexto: {
    color: cores.primaria,
    fontWeight: '600',
    fontSize: 15,
  },
  desabilitado: {
    opacity: 0.6,
  },
});
