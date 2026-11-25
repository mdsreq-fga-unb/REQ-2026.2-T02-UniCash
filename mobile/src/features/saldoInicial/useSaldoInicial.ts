import { useCallback, useEffect, useRef, useState } from 'react';

import { getDb } from '@/db/database';

import {
  consultarSaldoInicial,
  salvarSaldoInicial,
} from './repository';

import type { SaldoInicial } from './repository';

import { validarSaldoInicial } from './validation';
import type { DadosSaldoInicial } from './validation';

export function useSaldoInicial(uid: string) {
  const [saldo, setSaldo] = useState<SaldoInicial | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroConsulta, setErroConsulta] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const gravacaoEmAndamento = useRef(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroConsulta(false);
    setErro(null);

    try {
      if (!uid.trim()) {
        throw new Error('Usuário não identificado.');
      }

      const db = await getDb();
      const registro = await consultarSaldoInicial(db, uid);

      setSaldo(registro);
    } catch (e) {
      const motivo =
        e instanceof Error ? e.message : 'Erro desconhecido.';

      setErroConsulta(true);
      setErro(`Não foi possível consultar o saldo inicial. ${motivo}`);
    } finally {
      setCarregando(false);
    }
  }, [uid]);

  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      try {
        if (!uid.trim()) {
          throw new Error('Usuário não identificado.');
        }

        const db = await getDb();
        const registro = await consultarSaldoInicial(db, uid);

        if (ativo) {
          setSaldo(registro);
          setErro(null);
          setErroConsulta(false);
        }
      } catch (e) {
        const motivo =
          e instanceof Error ? e.message : 'Erro desconhecido.';

        if (ativo) {
          setSaldo(null);
          setErroConsulta(true);
          setErro(
            `Não foi possível consultar o saldo inicial. ${motivo}`,
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarInicial();

    return () => {
      ativo = false;
    };
  }, [uid]);

  async function salvar(
    dados: DadosSaldoInicial,
  ): Promise<boolean> {
    if (
      gravacaoEmAndamento.current ||
      carregando ||
      erroConsulta
    ) {
      return false;
    }

    setErro(null);
    setSucesso(null);

    const erroValidacao = validarSaldoInicial(dados);

    if (erroValidacao) {
      setErro(erroValidacao);
      return false;
    }

    gravacaoEmAndamento.current = true;
    setSalvando(true);

    try {
      const db = await getDb();

      const registro = await salvarSaldoInicial(
        db,
        uid,
        dados,
      );

      setSaldo(registro);

      setSucesso(
        'Saldo inicial salvo no dispositivo. Sincronização pendente.',
      );

      return true;
    } catch (e) {
      const motivo =
        e instanceof Error ? e.message : 'Erro desconhecido.';

      setErro(`Não foi possível salvar o saldo inicial. ${motivo}`);

      return false;
    } finally {
      gravacaoEmAndamento.current = false;
      setSalvando(false);
    }
  }

  return {
    saldo,
    carregando,
    salvando,
    erro,
    erroConsulta,
    sucesso,
    carregar,
    salvar,
  };
}
