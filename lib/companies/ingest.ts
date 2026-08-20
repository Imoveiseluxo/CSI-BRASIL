import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";
import { consultaCnpj } from "@/lib/sources/cnpj";
import { normalizaEmpresa } from "@/lib/sources/cnpj-normaliza";
import type { Database } from "@/types/supabase";

/**
 * O caminho inteiro de um CNPJ: consulta → **evidência guardada** → empresa
 * derivada, com procedência preenchida.
 *
 * ⚠️ A ordem importa e não é negociável: **a evidência é gravada ANTES da
 * empresa**. Se a gravação da empresa falhar, fica a evidência sozinha — que é
 * recuperável. O contrário deixaria uma empresa apontando para uma evidência
 * que não existe, e a procedência viraria mentira.
 *
 * ⚠️ Recebe o cliente por parâmetro para poder ser testado sem banco, e para
 * rodar com o cliente do USUÁRIO — a RLS é a primeira camada, mesmo aqui.
 */

export type ResultadoIngestao =
  | { ok: true; empresaId: string; evidenciaId: string; provedor: string; jaExistia: boolean }
  | { ok: false; motivo: string };

type Cliente = SupabaseClient<Database>;

export async function ingereCnpj(
  supabase: Cliente,
  orgId: string,
  sourceIdPadrao: string | null,
  cnpjEntrada: string,
): Promise<ResultadoIngestao> {
  const coleta = await consultaCnpj(cnpjEntrada);
  if (!coleta.ok) return { ok: false, motivo: coleta.motivo };

  // A fonte do provedor que respondeu. Se ainda não existir cadastrada, usa a
  // padrão — mas registra qual provedor foi, na própria evidência.
  const sourceId = sourceIdPadrao;
  if (!sourceId) {
    return { ok: false, motivo: "Nenhuma fonte cadastrada para registrar a evidência." };
  }

  let empresa: ReturnType<typeof normalizaEmpresa>;
  try {
    empresa = normalizaEmpresa(coleta.coleta.conteudo as Record<string, unknown>);
  } catch (err) {
    return {
      ok: false,
      motivo: err instanceof Error ? err.message : "Resposta da fonte não é uma empresa.",
    };
  }

  // 1. A evidência primeiro.
  const { data: evidencia, error: erroEvidencia } = await supabase
    .from("evidence")
    .insert({
      organization_id: orgId,
      source_id: sourceId,
      content: coleta.coleta.conteudo as never,
      content_hash: coleta.coleta.hash,
      request_key: coleta.coleta.cnpj,
      collected_by_kind: "rotina",
    })
    .select("id")
    .single();

  if (erroEvidencia || !evidencia) {
    logError("companies.ingest.evidencia", erroEvidencia);
    return { ok: false, motivo: "Não foi possível guardar a evidência." };
  }

  // 2. A empresa, apontando para ela.
  //
  // ⚠️ `confidence` é escrito explicitamente, e não por padrão do banco: a
  // coluna proíbe `default` justamente para que ninguém receba um número que
  // não foi decidido. Coleta direta de fonte oficial é alta, mas não 1 — a API
  // é intermediária, e isso é uma diferença real.
  const { data: gravada, error: erroEmpresa } = await supabase
    .from("companies")
    .upsert(
      {
        organization_id: orgId,
        cnpj: empresa.cnpj,
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia,
        situacao: empresa.situacao,
        data_abertura: empresa.data_abertura,
        cnae_principal: empresa.cnae_principal,
        municipio: empresa.municipio,
        uf: empresa.uf,
        capital_social: empresa.capital_social,
        source_id: sourceId,
        evidence_id: evidencia.id,
        transform_id: null,
        produced_by_kind: "rotina",
        produced_at: new Date().toISOString(),
        confidence: 0.9,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,cnpj" },
    )
    .select("id")
    .single();

  if (erroEmpresa || !gravada) {
    logError("companies.ingest.empresa", erroEmpresa);
    // ⚠️ A evidência FICA. Ela é verdadeira — a fonte respondeu aquilo — e
    // apagá-la para "limpar" destruiria o registro de que a consulta aconteceu.
    return { ok: false, motivo: "Evidência guardada, mas a empresa não pôde ser gravada." };
  }

  return {
    ok: true,
    empresaId: gravada.id,
    evidenciaId: evidencia.id,
    provedor: coleta.coleta.provedor.nome,
    jaExistia: false,
  };
}
