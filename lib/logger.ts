/**
 * Log de erro que **não** serializa o objeto inteiro do provedor.
 *
 * Extraído do Bahia Realty. Registra só `{ code, message }`, com a mensagem
 * truncada: objeto completo do Supabase carrega `details` e `hint`, que vazam
 * e-mail, trecho de consulta e nome de coluna para o log — e log de produção é
 * lido por gente que não precisa ver isso.
 *
 * ⚠️ Limite conhecido, e ele custou caro no projeto anterior: **`logError` não
 * imprime `cause`**. Quando o erro vem de um provedor externo, o motivo real
 * costuma estar aninhado ali — em 17/08/2026 isso escondeu a causa de 63 falhas
 * seguidas de envio, registradas como "Bad Request" por dois dias. Quem chama
 * este helper para erro de terceiro precisa **registrar `cause` explicitamente**.
 */
type ErrLike = { code?: string; message?: string } | Error | unknown;

export function logError(scope: string, err: ErrLike): void {
  if (err == null) {
    console.error(`[${scope}] erro: <nulo>`);
    return;
  }
  const obj = err as { code?: string; message?: string; name?: string };
  const code = obj.code ?? obj.name ?? "desconhecido";
  const msg = (obj.message ?? "").slice(0, 200);
  console.error(`[${scope}] ${code}: ${msg}`);
}
