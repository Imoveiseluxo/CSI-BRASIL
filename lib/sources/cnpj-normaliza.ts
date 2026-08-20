import { digitosDoCnpj } from "./cnpj-validacao";

/**
 * JSON da fonte → campos da ficha de empresa (seção Company Intelligence do book).
 *
 * ⚠️ **Campo ausente vira `null`, nunca zero, nunca string vazia.** No projeto
 * anterior, valor inventado por padrão virou número na tela que ninguém havia
 * medido, e painéis inteiros ficaram pendurados nele. `null` diz "não
 * informado"; `0` diz "medi e deu zero". São afirmações diferentes.
 *
 * ⚠️ Lógica pura, sem rede, de propósito: é o pedaço que mais muda quando a
 * fonte muda de formato, e precisa ser testável com uma amostra gravada.
 */

export type EmpresaNormalizada = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: string | null;
  data_abertura: string | null;
  cnae_principal: string | null;
  municipio: string | null;
  uf: string | null;
  capital_social: number | null;
};

/** Texto que só vale se tiver conteúdo de verdade. Espaço em branco não conta. */
function texto(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function numero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizaEmpresa(bruto: Record<string, unknown>): EmpresaNormalizada {
  const cnpj = digitosDoCnpj(texto(bruto.cnpj));
  if (!cnpj) {
    // ⚠️ Lançar, e não devolver null: a fonte também erra, e uma resposta sem
    // CNPJ válido não é uma empresa "incompleta" — não é uma empresa. Deixar
    // passar criaria linha de conhecimento sem identidade.
    throw new Error("Resposta da fonte sem CNPJ válido — não é uma empresa.");
  }
  const razao = texto(bruto.razao_social);
  if (!razao) {
    throw new Error("Resposta da fonte sem razão social — não é uma empresa.");
  }

  return {
    cnpj,
    razao_social: razao,
    nome_fantasia: texto(bruto.nome_fantasia),
    situacao: texto(bruto.descricao_situacao_cadastral ?? bruto.situacao),
    data_abertura: texto(bruto.data_inicio_atividade ?? bruto.data_abertura),
    cnae_principal: texto(bruto.cnae_fiscal),
    municipio: texto(bruto.municipio),
    uf: texto(bruto.uf),
    capital_social: numero(bruto.capital_social),
  };
}
