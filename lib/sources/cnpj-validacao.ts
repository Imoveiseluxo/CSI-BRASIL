/**
 * Validação de CNPJ pelo dígito verificador.
 *
 * ⚠️ Serve para **rejeitar antes de consultar**. CNPJ inválido não pode virar
 * chamada externa nem evidência: gasta cota da fonte, polui a auditoria e cria
 * evidência de uma pergunta que nunca deveria ter sido feita.
 */

/** Pesos do módulo 11, na ordem em que o algoritmo os consome. */
const PESOS_PRIMEIRO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = base.split("").reduce((acc, ch, i) => acc + Number(ch) * (pesos[i] as number), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function ehCnpjValido(entrada: string | null | undefined): boolean {
  const d = String(entrada ?? "").replace(/\D/g, "");
  if (d.length !== 14) return false;

  // ⚠️ Todos os dígitos iguais PASSAM na conta do módulo 11 e não existem na
  // vida real. Sem esta linha, `00000000000000` viraria consulta e evidência.
  if (/^(\d)\1{13}$/.test(d)) return false;

  const primeiro = digitoVerificador(d.slice(0, 12), PESOS_PRIMEIRO);
  if (primeiro !== Number(d[12])) return false;

  const segundo = digitoVerificador(d.slice(0, 13), PESOS_SEGUNDO);
  return segundo === Number(d[13]);
}

/**
 * Só os dígitos, pronto para virar chave de consulta — ou `null`.
 *
 * ⚠️ Devolve `null` em vez de string vazia de propósito: não existe "meio
 * válido". Quem receber `null` tem que decidir o que fazer; quem recebesse `""`
 * poderia seguir adiante sem perceber.
 */
export function digitosDoCnpj(entrada: string | null | undefined): string | null {
  if (!ehCnpjValido(entrada)) return null;
  return String(entrada).replace(/\D/g, "");
}
