import { useCallback, useContext, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { BancoPronto } from '@/db/Preparacao';
import { deveOferecerTutorial } from './estado';
import { abrirTutorial } from './navegacao';

export function useOfertaTutorial() {
  const bancoPronto = useContext(BancoPronto);
  const [estado, setEstado] = useState<'pendente' | 'verificado' | 'erro'>('pendente');

  useFocusEffect(useCallback(() => {
    if (!bancoPronto || estado !== 'pendente') return;
    let ativo = true;

    void deveOferecerTutorial().then((oferecer) => {
      if (!ativo) return;
      if (oferecer) abrirTutorial('primeiro-acesso');
      setEstado('verificado');
    }).catch(() => {
      if (ativo) setEstado('erro');
    });

    return () => { ativo = false; };
  }, [bancoPronto, estado]));

  return {
    verificando: bancoPronto && estado === 'pendente',
    falhou: estado === 'erro',
    tentarNovamente: () => setEstado('pendente'),
  };
}
