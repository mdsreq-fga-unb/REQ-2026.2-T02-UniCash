import type { UnidadeRecorrencia } from './types';

const p2 = (n: number) => n.toString().padStart(2, '0');
const toISO = (d: Date) => `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
const fromISO = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};

export function hojeISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())}`;
}

/** "16/10/2026" -> "2026-10-16"; null se vazio, incompleto ou inexistente (ex.: 31/02). */
export function parseBR(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (a < 1900 || a > 2200) return null;
  const dt = new Date(Date.UTC(a, mes - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== mes - 1 || dt.getUTCDate() !== d) return null;
  return `${a}-${p2(mes)}-${p2(d)}`;
}

export function formatarBR(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/** Máscara de digitação DD/MM/AAAA. */
export function mascararData(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

export function adicionarDias(iso: string, dias: number): string {
  const d = fromISO(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return toISO(d);
}

/** Soma meses mantendo o dia quando possível (31/01 + 1 mês = 28 ou 29/02). */
export function adicionarMeses(iso: string, meses: number): string {
  const d = fromISO(iso);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return toISO(d);
}

export function adicionarIntervalo(iso: string, n: number, unidade: UnidadeRecorrencia): string {
  if (unidade === 'dia') return adicionarDias(iso, n);
  if (unidade === 'mes') return adicionarMeses(iso, n);
  return adicionarMeses(iso, n * 12);
}

export function primeiroDiaDoMes(ano: number, mes: number): string {
  return `${ano}-${p2(mes)}-01`;
}

export function proximoMes(ano: number, mes: number) {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
}

export function mesAnterior(ano: number, mes: number) {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
}

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
export const nomeMes = (ano: number, mes: number) => `${NOMES_MES[mes - 1]}/${ano}`;
