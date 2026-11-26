import { useContext, useEffect, useState } from 'react';
import { BancoPronto } from '@/db/Preparacao';
import { deveOferecerTutorial } from './estado';
import { abrirTutorial } from './navegacao';

export function useOfertaTutorial(habilitada: boolean) {
  const bancoPronto = useContext(BancoPronto);
  const [estado, setEstado] = useState<'pendente' | 'verificado' | 'erro'>('pendente');

  useEffect(() => {
    if (!habilitada || !bancoPronto || estado !== 'pendente') return;
    let ativo = true;

    void deveOferecerTutorial().then(async (oferecer) => {
      if (!ativo) return;
      const abriu = !oferecer || await abrirTutorial('primeiro-acesso');
      if (ativo) setEstado(abriu ? 'verificado' : 'erro');
    }).catch(() => {
      if (ativo) setEstado('erro');
    });

    return () => { ativo = false; };
  }, [bancoPronto, estado, habilitada]);

  return {
    verificando: habilitada && bancoPronto && estado === 'pendente',
    falhou: estado === 'erro',
    tentarNovamente: () => setEstado('pendente'),
  };
}
