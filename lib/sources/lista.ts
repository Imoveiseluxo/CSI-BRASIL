import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type FonteResumo = { id: string; name: string };

/**
 * As fontes da organização, para o seletor de filtro da busca.
 *
 * ⚠️ Roda com o cliente do usuário: a RLS decide quais fontes ele enxerga. Uma
 * lista de fontes já é informação — nomes de fonte revelam o que a organização
 * monitora, e isso não é nosso para mostrar a quem não pertence a ela.
 */
export async function fontesDaOrg(
  supabase: SupabaseClient<Database>,
  orgId: string,
): Promise<FonteResumo[]> {
  const { data, error } = await supabase
    .from("sources")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}
