import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * A rede de ligações a partir de um CNPJ.
 *
 * ⚠️ **Roda com o cliente do usuário**, e as funções no banco são `security
 * invoker`. A camada de referência é pública, mas a regra continua valendo:
 * função que lê tabela com RLS e roda elevada devolve o que quiser a quem
 * quiser.
 */

export type Certeza = "confirmada" | "provavel" | "possivel";

export type Ligacao = {
  salto: number;
  origemCnpj: string;
  origemNome: string | null;
  vinculo: string;
  socioNome: string | null;
  qualificacao: string | null;
  destinoCnpj: string;
  destinoNome: string | null;
  certeza: Certeza;
  motivo: string;
};

export type Socio = {
  nome: string;
  tipo: string;
  qualificacao: string | null;
  entrada: string | null;
  /** Quantas OUTRAS empresas esta pessoa tem — o número que faz alguém expandir. */
  outrasEmpresas: number;
};

/**
 * Só os 8 primeiros dígitos identificam a raiz da empresa.
 *
 * ⚠️ A base da Receita organiza `rf_empresas` e `rf_socios` pela RAIZ, não pelo
 * CNPJ completo: os quatro dígitos da filial e os dois do verificador não
 * existem lá. Procurar pelo CNPJ inteiro não acharia nada — e "não achou"
 * pareceria "não existe".
 */
export function raizDoCnpj(entrada: string): string | null {
  const so = entrada.replace(/\D/g, "");
  if (so.length !== 8 && so.length !== 14) return null;
  return so.slice(0, 8);
}

const CERTEZAS: Record<string, Certeza> = {
  confirmada: "confirmada",
  provavel: "provavel",
  possivel: "possivel",
};

export async function ligacoesPorCnpj(
  supabase: SupabaseClient<Database>,
  cnpjBasico: string,
  saltos: number,
  limite = 500,
): Promise<Ligacao[]> {
  const { data, error } = await supabase.rpc("rede_por_cnpj", {
    p_cnpj_basico: cnpjBasico,
    p_saltos: saltos,
    p_limite: limite,
  });
  if (error) throw error;

  type Linha = {
    salto: number;
    origem_cnpj: string;
    origem_nome: string | null;
    vinculo: string;
    socio_nome: string | null;
    qualificacao: string | null;
    destino_cnpj: string;
    destino_nome: string | null;
    certeza: string;
    motivo: string;
  };

  return ((data ?? []) as unknown as Linha[]).map((l) => ({
    salto: l.salto,
    origemCnpj: l.origem_cnpj,
    origemNome: l.origem_nome,
    vinculo: l.vinculo,
    socioNome: l.socio_nome,
    qualificacao: l.qualificacao,
    destinoCnpj: l.destino_cnpj,
    destinoNome: l.destino_nome,
    // ⚠️ Certeza desconhecida cai para a MAIS FRACA, nunca para a mais forte.
    // Errar para o lado de "possível" custa uma dúvida; errar para o lado de
    // "confirmada" põe uma afirmação falsa num relatório.
    certeza: CERTEZAS[l.certeza] ?? "possivel",
    motivo: l.motivo,
  }));
}

export async function sociosDaEmpresa(
  supabase: SupabaseClient<Database>,
  cnpjBasico: string,
): Promise<Socio[]> {
  const { data, error } = await supabase.rpc("socios_da_empresa", {
    p_cnpj_basico: cnpjBasico,
  });
  if (error) throw error;

  type Linha = {
    nome: string;
    tipo: string;
    qualificacao: string | null;
    entrada: string | null;
    outras_empresas: number;
  };

  return ((data ?? []) as unknown as Linha[]).map((l) => ({
    nome: l.nome,
    tipo: l.tipo,
    qualificacao: l.qualificacao,
    entrada: l.entrada,
    outrasEmpresas: Number(l.outras_empresas ?? 0),
  }));
}

export type EmpresaRef = {
  cnpjBasico: string;
  razaoSocial: string | null;
  naturezaJuridica: string | null;
  capitalSocial: string | null;
  porte: string | null;
};

export async function empresaDeReferencia(
  supabase: SupabaseClient<Database>,
  cnpjBasico: string,
): Promise<EmpresaRef | null> {
  const { data, error } = await supabase
    .from("rf_empresas")
    .select("cnpj_basico, razao_social, natureza_juridica, capital_social, porte")
    .eq("cnpj_basico", cnpjBasico)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    cnpjBasico: data.cnpj_basico,
    razaoSocial: data.razao_social,
    naturezaJuridica: data.natureza_juridica,
    capitalSocial: data.capital_social === null ? null : String(data.capital_social),
    porte: data.porte,
  };
}

/**
 * A procedência da camada de referência: de qual arquivo, de qual endereço e
 * de qual mês veio o que está sendo mostrado.
 *
 * ⚠️ Sem isto a rede seria a única tela do produto sem origem à vista — dentro
 * de um sistema cuja premissa é o contrário.
 */
export type Procedencia = {
  mesBase: string;
  origemUrl: string;
  origemTipo: string;
  contentHash: string;
  concluidaEm: string | null;
  linhas: number | null;
};

export async function procedenciaDaBase(
  supabase: SupabaseClient<Database>,
): Promise<Procedencia[]> {
  const { data, error } = await supabase
    .from("rf_carga")
    .select("mes_base, origem_url, origem_tipo, content_hash, concluida_em, linhas, tabela_destino")
    .eq("tabela_destino", "rf_socios")
    .not("concluida_em", "is", null)
    .order("concluida_em", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((c) => ({
    mesBase: c.mes_base,
    origemUrl: c.origem_url,
    origemTipo: c.origem_tipo,
    contentHash: c.content_hash,
    concluidaEm: c.concluida_em,
    linhas: c.linhas === null ? null : Number(c.linhas),
  }));
}
