import { ehPapelValido, type OrgRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type Organizacao = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

/**
 * O banco devolve `string`; aqui vira `OrgRole` **verificado**.
 *
 * ⚠️ Papel desconhecido lança em vez de passar adiante. Deixar passar levaria
 * um valor fora da matriz até `canAccess` — que negaria por padrão, sim, mas em
 * silêncio, e ninguém descobriria que existe gente com papel inválido no banco.
 */
function papel(v: string): OrgRole {
  if (!ehPapelValido(v)) {
    throw new Error(`Papel desconhecido no banco: ${v}`);
  }
  return v;
}

export type Vinculo = {
  role: OrgRole;
  organization: Organizacao;
};

/**
 * O vínculo desta pessoa com ESTA organização, ou `null` se não houver.
 *
 * Extraído do Bahia Realty. Roda com o cliente do usuário de propósito: a RLS
 * é a primeira camada, e esta consulta é a segunda. Se um dia a RLS falhar, a
 * consulta ainda filtra; se a consulta esquecer o filtro, a RLS ainda corta.
 */
/**
 * ⚠️ `.returns<>()` aqui é **asserção declarada, não inferência**.
 *
 * O `types/supabase.ts` de hoje é um esboço escrito à mão e não descreve os
 * relacionamentos entre as tabelas — então o Supabase não consegue tipar o
 * `join` embutido e devolve `never`. Em vez de inventar relacionamentos no
 * esboço (que criaria um tipo bonito descrevendo um banco que não existe),
 * a asserção fica **visível e comentada**.
 *
 * **No dia em que `types/supabase.ts` for gerado do banco, apague o
 * `.returns<>()` e confira que o tipo inferido bate.** Se não bater, o código
 * está errado e este comentário terá sido a única pista.
 */
type LinhaVinculo = { role: OrgRole; organization: Organizacao };

export async function getOrgBySlug(slug: string, userId: string): Promise<Vinculo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, organization:organizations!inner(id, slug, name, created_at)")
    .eq("user_id", userId)
    .eq("organization.slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { role: papel(data.role), organization: data.organization };
}

/**
 * Todas as organizações desta pessoa.
 *
 * ⚠️ `order` explícito não é enfeite: sem ele o Postgres não garante ordem
 * nenhuma, e quem tem duas organizações cairia numa ou noutra a cada login —
 * comportamento que parece bug intermitente e é dificílimo de reproduzir.
 */
export async function getUserOrgs(userId: string): Promise<Vinculo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, organization:organizations!inner(id, slug, name, created_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((linha) => ({
    role: papel(linha.role),
    organization: linha.organization,
  }));
}
