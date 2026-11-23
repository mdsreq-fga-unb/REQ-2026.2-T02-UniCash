import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CategoriaForm } from '@/components/categorias/CategoriaForm';
import { criarCategoria, FalhaPersistenciaCategoria, NomeDuplicado } from '@/features/categorias/service';
import { EntradaCategoriaInvalida, MSG_CAT } from '@/features/categorias/validation';
import { CATEGORIA_CRIADA, setFeedback } from '@/features/categorias/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import type { CategoriaInput } from '@/features/categorias/types';
import { cores } from '@/lib/theme';

export default function NovaCategoria() {
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [erroNome, setErroNome] = useState<string | null>(null);

  async function salvar(dados: CategoriaInput) {
    if (salvando) return; // concorrência adicional à trava interna do formulário
    setSalvando(true);
    setErroGeral(null);
    setErroNome(null);
    try {
      await criarCategoria(dados); // só confirma após o commit (RN11); limites já validados
      sincronizarEmSegundoPlano();
      setFeedback(CATEGORIA_CRIADA);
      router.dismissTo('/categorias');
    } catch (e) {
      if (e instanceof NomeDuplicado) {
        setErroNome(MSG_CAT.nomeDuplicado); // EX07: erro no campo nome
      } else if (e instanceof EntradaCategoriaInvalida) {
        setErroGeral(e.message); // RN13/RN14: defesa em profundidade, dados preservados
      } else if (e instanceof FalhaPersistenciaCategoria) {
        setErroGeral(MSG_CAT.falhaSalvar); // EX03
      } else {
        setErroGeral(MSG_CAT.falhaSalvar); // inesperado: tela permanece, nada é perdido
      }
      setSalvando(false); // libera a trava do formulário para nova tentativa
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top', 'bottom']}>
      <CategoriaForm
        titulo="Nova categoria"
        textoSalvar="Salvar categoria"
        salvando={salvando}
        erroGeral={erroGeral}
        erroNomeExterno={erroNome}
        onNomeAlterado={() => setErroNome(null)} // limpa o erro de duplicidade ao editar o nome
        onSalvar={salvar} // devolve a Promise: o formulário libera a trava quando ela termina
        onCancelar={() => router.back()}
      />
    </SafeAreaView>
  );
}
