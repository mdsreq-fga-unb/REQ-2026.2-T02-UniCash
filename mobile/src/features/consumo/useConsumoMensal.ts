import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ouvirBaseAtualizada } from '@/lib/baseAtualizada';
import type { EstadoConsumo } from '@/components/consumo/IndicadoresConsumo';
import { consultarConsumoMensal } from './consulta';
import { lerTotaisLocais } from './sqlite';

export function useConsumoMensal(mes: string, habilitado = true) {
  const [resultado, setResultado] = useState<{ mes: string; tentativa: number; estado: EstadoConsumo }>();
  const [tentativa, setTentativa] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!habilitado) return;
    let ativo = true;
    let ultimaConsulta = 0;

    function atualizar() {
      const consulta = ++ultimaConsulta;
      setResultado({ mes, tentativa, estado: { tipo: 'carregando' } });
      void consultarConsumoMensal(mes, lerTotaisLocais).then(
        (itens) => aplicar({ tipo: 'pronto', itens }),
        () => aplicar({ tipo: 'erro' }),
      );
      function aplicar(estado: EstadoConsumo) {
        if (ativo && consulta === ultimaConsulta) setResultado({ mes, tentativa, estado });
      }
    }

    atualizar();
    const parar = ouvirBaseAtualizada(atualizar);
    return () => { ativo = false; parar(); };
  }, [mes, habilitado, tentativa]));

  return {
    estado: resultado?.mes === mes && resultado.tentativa === tentativa ? resultado.estado : { tipo: 'carregando' } as const,
    tentarNovamente: () => setTentativa((atual) => atual + 1),
  };
}
