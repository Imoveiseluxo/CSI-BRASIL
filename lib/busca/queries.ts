import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Busca textual sobre o que já foi coletado.
 *
 * ⚠️ **Roda com o cliente do usuário**, então a RLS decide o que ele pode achar.
 * Busca com cliente de serviço acharia dado de qualquer organização — e busca é
 * justamente onde um vazamento passa despercebido, porque o resultado parece
 * legítimo.
 */

export type AchadoEmpresa = {
  tipo: "empresa";
  id: string;
  titulo: string;
  detalhe: string;
  fonte: string | null;
  coletadoEm: string | null;
  confianca: number | null;
};

export type AchadoEvidencia = {
  tipo: "evidencia";
  id: string;
  titulo: string;
  detalhe: string;
  fonte: string | null;
  coletadoEm: string | null;
  confianca: null;
};

export type Achado = AchadoEmpresa | AchadoEvidencia;

/**
 * Tira o acento do termo digitado.
 *
 * ⚠️ **O índice do banco guarda o texto sem acento** (migration 0009), então o
 * termo tem que chegar igual. Tirar de um lado só deixaria a busca meio
 * consertada — que é pior que não consertada: funcionaria para quem digita sem
 * acento e falharia para quem digita certo.
 *
 * ⚠️ Isto veio de medição, não de suposição: `to_tsvector('portuguese','SÃO
 * PAULO')` **não** casa com `websearch_to_tsquery('portuguese','sao paulo')`.
 */
export function semAcento(t: string): string {
  return t.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Traduz o que a pessoa digitou em consulta de busca.
 *
 * ⚠️ `websearch_to_tsquery` em vez de montar a consulta na mão: ele entende
 * aspas e `-palavra`, e **nunca lança** com entrada estranha. Montar à mão
 * significaria tratar cada caractere especial — e um esquecido derruba a busca
 * com erro que o usuário não entende.
 */
export async function busca(
  supabase: SupabaseClient<Database>,
  orgId: string,
  termo: string,
): Promise<Achado[]> {
  const limpo = semAcento(termo.trim());
  if (!limpo) return [];

  const [empresas, evidencias] = await Promise.all([
    supabase
      .from("companies")
      .select(
        "id, razao_social, nome_fantasia, cnpj, municipio, uf, situacao, confidence, evidence:evidence!companies_evidence_mesma_org(collected_at), source:sources!companies_source_mesma_org(name)",
      )
      .eq("organization_id", orgId)
      .textSearch("busca", limpo, { type: "websearch", config: "portuguese" })
      .limit(20),
    supabase
      .from("evidence")
      .select("id, request_key, collected_at, source:sources(name)")
      .eq("organization_id", orgId)
      .textSearch("busca", limpo, { type: "websearch", config: "portuguese" })
      .limit(20),
  ]);

  const achados: Achado[] = [];

  for (const e of empresas.data ?? []) {
    const ev = e.evidence as unknown as { collected_at: string } | null;
    const fo = e.source as unknown as { name: string } | null;
    achados.push({
      tipo: "empresa",
      id: e.id,
      titulo: e.razao_social,
      detalhe: [e.nome_fantasia, e.cnpj, [e.municipio, e.uf].filter(Boolean).join("/"), e.situacao]
        .filter(Boolean)
        .join(" · "),
      fonte: fo?.name ?? null,
      coletadoEm: ev?.collected_at ?? null,
      confianca: e.confidence === null ? null : Number(e.confidence),
    });
  }

  for (const v of evidencias.data ?? []) {
    const fo = v.source as unknown as { name: string } | null;
    achados.push({
      tipo: "evidencia",
      id: v.id,
      titulo: v.request_key ?? "(sem chave)",
      // ⚠️ Não mostramos o conteúdo aqui: evidência crua pode conter dado
      // pessoal, e uma lista de busca não é lugar de despejar isso.
      detalhe: "artefato bruto guardado",
      fonte: fo?.name ?? null,
      coletadoEm: v.collected_at,
      confianca: null,
    });
  }

  return achados;
}
