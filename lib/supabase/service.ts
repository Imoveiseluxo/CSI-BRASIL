// ⚠️ `server-only` não é enfeite. Extraído do Bahia Realty, onde até 16/08/2026
// "nunca exponha pro browser" era só um comentário — e comentário não trava nada.
// Com este import, um Client Component que importar este arquivo **quebra o
// build** com mensagem clara, em vez de embarcar no pacote que todo visitante
// baixa a chave que ignora RLS.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Cliente com papel de serviço — **ignora RLS**.
 *
 * Use SÓ em rotina de servidor (coleta, webhook, cron). Nunca numa página, nunca
 * numa leitura que o usuário dispara: ali vale `server.ts`, que respeita RLS.
 *
 * ⚠️ No projeto anterior, uma escrita feita com o cliente do usuário onde devia
 * ser o de serviço fez a RLS recusar em silêncio e um registro de auditoria
 * deixou de existir sem erro nenhum. A escolha entre os dois clientes é decisão
 * de segurança, não de conveniência.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não está definida — necessária para rotinas de servidor.",
    );
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
