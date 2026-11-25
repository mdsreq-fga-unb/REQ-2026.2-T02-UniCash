import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { SaldoInicialForm } from '@/components/saldoInicial/SaldoInicialForm';

import type { SaldoInicial } from '@/features/saldoInicial/repository';

const onSalvar = jest.fn();
const onCancelar = jest.fn();

function registro(
  extra: Partial<SaldoInicial> = {},
): SaldoInicial {
  return {
    uid: 'usuario-1',
    valor_centavos: -15050,
    mes_referencia: '2026-11',
    sync_status: 'pendente',
    atualizado_em: '2026-11-01T00:00:00Z',
    ...extra,
  };
}

type Props = React.ComponentProps<typeof SaldoInicialForm>;

async function renderizar(
  extra: Partial<Props> = {},
) {
  return render(
    <SaldoInicialForm
      saldo={null}
      salvando={false}
      erro={null}
      sucesso={null}
      onSalvar={onSalvar}
      onCancelar={onCancelar}
      {...extra}
    />,
  );
}

async function preencher(
  valor: string,
  mes = 'Novembro',
  ano = '2026',
) {
  await fireEvent.changeText(
    screen.getByLabelText('Valor do saldo inicial'),
    valor,
  );

  await fireEvent.press(
    screen.getByRole('button', { name: mes }),
  );

  await fireEvent.changeText(
    screen.getByLabelText('Ano de referência'),
    ano,
  );
}

async function pressionarSalvar() {
  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Salvar saldo inicial',
    }),
  );
}

describe('UC08 — SaldoInicialForm', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    onSalvar.mockResolvedValue(true);
  });

  it('exibe os campos do formulário', async () => {
    await renderizar();

    expect(
      screen.getByText('Saldo inicial'),
    ).toBeTruthy();

    expect(
      screen.getByLabelText('Valor do saldo inicial'),
    ).toBeTruthy();

    expect(
      screen.getByLabelText('Ano de referência'),
    ).toBeTruthy();

    expect(
      screen.getByText('Mês de referência'),
    ).toBeTruthy();

    expect(
      screen.getByRole('button', {
        name: 'Salvar saldo inicial',
      }),
    ).toBeTruthy();
  });

  it('informa quando não existe saldo cadastrado', async () => {
    await renderizar();

    expect(
      screen.getByText(
        'Nenhum saldo inicial cadastrado.',
      ),
    ).toBeTruthy();
  });

  it('exibe o saldo cadastrado e preenche os campos', async () => {
    await renderizar({
      saldo: registro(),
    });

    expect(
      screen.getByText('Saldo inicial cadastrado'),
    ).toBeTruthy();

    expect(
      screen.getByText('R$ -150,50'),
    ).toBeTruthy();

    expect(
      screen.getByText('Referência: 2026-11'),
    ).toBeTruthy();

    expect(
      screen.getByLabelText('Valor do saldo inicial')
        .props.value,
    ).toBe('-150,50');

    expect(
      screen.getByLabelText('Ano de referência')
        .props.value,
    ).toBe('2026');

    expect(
      screen.getByRole('button', {
        name: 'Novembro',
      }).props.accessibilityState.selected,
    ).toBe(true);
  });

  it('exibe indicador de sincronização pendente', async () => {
    await renderizar({
      saldo: registro(),
    });

    expect(
      screen.getByText('Sincronização pendente'),
    ).toBeTruthy();
  });

  it('exibe indicador de saldo sincronizado', async () => {
    await renderizar({
      saldo: registro({
        sync_status: 'sincronizado',
      }),
    });

    expect(
      screen.getByText('Sincronizado'),
    ).toBeTruthy();
  });

  it.each([
    ['150,50', 15050],
    ['-150,50', -15050],
    ['0,00', 0],
    ['100', 10000],
    ['10,5', 1050],
  ])(
    'converte o valor %s corretamente para centavos',
    async (valor, centavos) => {
      await renderizar();

      await preencher(valor);
      await pressionarSalvar();

      await waitFor(() => {
        expect(onSalvar).toHaveBeenCalledWith({
          valorCentavos: centavos,
          mesReferencia: '2026-11',
        });
      });

      expect(onSalvar).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    '',
    'abc',
    '10,555',
    '--100',
  ])(
    'rejeita valor monetário inválido: %s',
    async (valor) => {
      await renderizar();

      await preencher(valor);
      await pressionarSalvar();

      expect(onSalvar).not.toHaveBeenCalled();

      expect(
        screen.getByText(
          'Informe um valor monetário válido.',
        ),
      ).toBeTruthy();
    },
  );

  it('exige o mês de referência', async () => {
    await renderizar();

    await fireEvent.changeText(
      screen.getByLabelText('Valor do saldo inicial'),
      '100,00',
    );

    await pressionarSalvar();

    expect(onSalvar).not.toHaveBeenCalled();

    expect(
      screen.getByText('Informe o mês de referência.'),
    ).toBeTruthy();
  });

  it('rejeita ano inválido', async () => {
    await renderizar();

    await preencher('100,00', 'Janeiro', '0000');
    await pressionarSalvar();

    expect(onSalvar).not.toHaveBeenCalled();

    expect(
      screen.getByText('Informe um ano válido.'),
    ).toBeTruthy();
  });

  it('permite alterar um saldo já cadastrado', async () => {
    await renderizar({
      saldo: registro(),
    });

    await preencher('250,00', 'Dezembro', '2026');
    await pressionarSalvar();

    await waitFor(() => {
      expect(onSalvar).toHaveBeenCalledWith({
        valorCentavos: 25000,
        mesReferencia: '2026-12',
      });
    });
  });

  it('exibe mensagem de sucesso', async () => {
    const mensagem =
      'Saldo inicial salvo no dispositivo. Sincronização pendente.';

    await renderizar({
      sucesso: mensagem,
    });

    expect(
      screen.getByText(mensagem),
    ).toBeTruthy();
  });

  it('exibe mensagem de erro com o motivo da falha', async () => {
    const mensagem =
      'Não foi possível salvar o saldo inicial. Falha no banco.';

    await renderizar({
      erro: mensagem,
    });

    expect(
      screen.getByText(mensagem),
    ).toBeTruthy();
  });

  it('desabilita os campos durante a gravação', async () => {
    await renderizar({
      salvando: true,
    });

    expect(
      screen.getByLabelText('Valor do saldo inicial')
        .props.editable,
    ).toBe(false);

    expect(
      screen.getByLabelText('Ano de referência')
        .props.editable,
    ).toBe(false);

    expect(
      screen.getByRole('button', {
        name: 'Novembro',
      }).props.accessibilityState.disabled,
    ).toBe(true);

    expect(
      screen.queryByText('Salvar saldo inicial'),
    ).toBeNull();

    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('executa a ação de voltar', async () => {
    await renderizar();

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Voltar',
      }),
    );

    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
