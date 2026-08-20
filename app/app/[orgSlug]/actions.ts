"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/auth/guards";
import { ingereCnpj } from "@/lib/companies/ingest";
import { createClient } from "@/lib/supabase/server";

/**
 * Consulta um CNPJ e registra a empresa com procedência.
 *
 * ⚠️ **A guarda vem primeiro, e é `requireSection`**, não uma lista solta de
 * papéis: a matriz central decide, e assim uma mudança de papel não precisa ser
 * caçada em dezenas de arquivos.
 *
 * ⚠️ **Roda com o cliente do USUÁRIO**, não com o de serviço. A RLS é a primeira
 * camada: se esta ação esquecer um filtro, o banco corta. Usar o de serviço aqui
 * seria trocar uma proteção real por conveniência.
 */
export type EstadoConsulta = {
  ok?: true;
  provedor?: string;
  erro?: string;
} | null;

export async function consultarCnpjAction(
  _anterior: EstadoConsulta,
  formData: FormData,
): Promise<EstadoConsulta> {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  if (!cnpj) return { erro: "Informe um CNPJ." };

  const { org } = await requireSection({ orgSlug, section: "projetos" });
  const supabase = await createClient();

  const { data: fonte } = await supabase
    .from("sources")
    .select("id")
    .eq("organization_id", org.id)
    .eq("kind", "api")
    .limit(1)
    .maybeSingle();

  const r = await ingereCnpj(supabase, org.id, fonte?.id ?? null, cnpj);
  if (!r.ok) return { erro: r.motivo };

  revalidatePath(`/app/${orgSlug}`);
  return { ok: true, provedor: r.provedor };
}
