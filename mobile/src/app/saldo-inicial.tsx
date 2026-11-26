import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Botao } from '@/components/conta/Botao';
import { TelaConta } from '@/components/conta/TelaConta';
import { Aviso } from '@/components/conta/Aviso';
import { hojeISO, mesAnterior, proximoMes } from '@/features/receitas/dates';
import { Campo } from '@/components/receitas/Campo';
import { centavosParaTexto, formatarBRL } from '@/features/receitas/money';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { lerSaldoInicial, salvarSaldoInicial, type SaldoInicial } from '@/features/saldoInicial/service';
import { mesReferenciaValido, valorSaldoInicial } from '@/features/saldoInicial/validacao';
import { avisarBaseAtualizada, ouvirBaseAtualizada } from '@/lib/baseAtualizada';

const falhaLeitura = 'Não foi possível consultar o saldo inicial.';

function comSinal(valor: number, formatar: (centavos: number) => string): string {
  return (valor < 0 ? '-' : '') + formatar(Math.abs(valor));
}

export default function TelaSaldoInicial() {
  const [saldo, setSaldo] = useState<SaldoInicial | null>();
  const [valor, setValor] = useState('');
  const [mes, setMes] = useState('');
  const [erros, setErros] = useState<{ valor?: string; mes?: string }>({});
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const montada = useRef(false);
  const gravacaoEmCurso = useRef(false);

  const carregar = useCallback(async (preencher: boolean) => {
    try {
      const atual = await lerSaldoInicial();
      if (!montada.current) return;
      setSaldo(atual);
      if (preencher) {
        setValor(atual ? comSinal(atual.valor_centavos, centavosParaTexto) : '');
        setMes(atual?.mes_referencia ?? '');
        setMensagem('');
      }
    } catch {
      if (montada.current && preencher) setMensagem(falhaLeitura);
    }
  }, []);

  useEffect(() => {
    montada.current = true;
    void Promise.resolve().then(() => carregar(true));
    const cancelar = ouvirBaseAtualizada(() => { void carregar(false); });
    return () => { montada.current = false; cancelar(); };
  }, [carregar]);

  function moverMes(direcao: -1 | 1) {
    const base = mesReferenciaValido(mes) ? mes : hojeISO().slice(0, 7);
    const [ano, numero] = base.split('-').map(Number);
    const destino = direcao < 0 ? mesAnterior(ano, numero) : proximoMes(ano, numero);
    const texto = `${String(destino.ano).padStart(4, '0')}-${String(destino.mes).padStart(2, '0')}`;
    if (mesReferenciaValido(texto)) setMes(texto);
  }

  async function salvar() {
    if (gravacaoEmCurso.current) return;
    const centavos = valorSaldoInicial(valor);
    const mesValido = mesReferenciaValido(mes.trim());
    setErros({
      valor: centavos === null ? 'Informe um valor em reais com até duas casas decimais e dentro da faixa suportada.' : undefined,
      mes: mesValido ? undefined : 'Informe um mês válido no formato AAAA-MM.',
    });
    setMensagem('');
    if (centavos === null || !mesValido) return;

    gravacaoEmCurso.current = true;
    setSalvando(true);
    try {
      await salvarSaldoInicial({ valor_centavos: centavos, mes_referencia: mes.trim() });
      if (montada.current) setMensagem('Saldo inicial salvo neste aparelho.');
      avisarBaseAtualizada();
      sincronizarEmSegundoPlano(true);
    } catch {
      if (montada.current) setMensagem('Não foi possível salvar o saldo inicial. Tente novamente.');
    } finally {
      gravacaoEmCurso.current = false;
      if (montada.current) setSalvando(false);
    }
  }

  return (
    <TelaConta titulo="Saldo inicial" subtitulo="Defina o valor de partida e seu mês de referência." onVoltar={() => router.back()}>
      {mensagem ? <Aviso tipo={mensagem.startsWith('Não') ? 'erro' : 'sucesso'} texto={mensagem} /> : null}
      {saldo === undefined ? (
        mensagem === falhaLeitura
          ? <Botao rotulo="Tentar novamente" onPress={() => { void carregar(true); }} />
          : <ActivityIndicator accessibilityLabel="Consultando saldo inicial" />
      ) : (
        <View>
          <Text>
            {saldo
              ? `Saldo inicial atual: ${comSinal(saldo.valor_centavos, formatarBRL)} · ${saldo.mes_referencia}`
              : 'Saldo inicial ainda não definido.'}
          </Text>
          {saldo?.sync_status === 'pendente' ? <Text accessibilityLiveRegion="polite">Sincronização pendente</Text> : null}
          <Campo rotulo="Valor em reais" prefixo="R$" placeholder="Ex.: -125,50"
            value={valor} onChangeText={setValor} erro={erros.valor} editable={!salvando} />
          <Campo rotulo="Mês de referência" placeholder="AAAA-MM" maxLength={7}
            value={mes} onChangeText={setMes} erro={erros.mes} editable={!salvando}
            abaixo={(
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Botao rotulo="Mês anterior" tipo="link" desabilitado={salvando} onPress={() => moverMes(-1)} />
                <Botao rotulo="Próximo mês" tipo="link" desabilitado={salvando} onPress={() => moverMes(1)} />
              </View>
            )} />
          <Botao rotulo="Salvar saldo inicial" carregando={salvando} onPress={() => { void salvar(); }} />
        </View>
      )}
    </TelaConta>
  );
}
