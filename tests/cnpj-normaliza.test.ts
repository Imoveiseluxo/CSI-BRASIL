/**
 * Normalização: JSON da fonte → campos da empresa. Lógica pura, sem rede.
 *
 * ⚠️ A regra que rege este arquivo: **campo ausente vira `null`, nunca zero,
 * nunca string vazia.** No projeto anterior, valor inventado por padrão virou
 * número na tela que ninguém havia medido, e painéis inteiros ficaram
 * pendurados nele.
 */
import { describe, expect, it } from "vitest";
import { normalizaEmpresa } from "@/lib/sources/cnpj-normaliza";

/** Amostra no formato da BrasilAPI, reduzida ao que usamos. */
const AMOSTRA = {
  cnpj: "33000167000101",
  razao_social: "PETROLEO BRASILEIRO S A PETROBRAS",
  nome_fantasia: "PETROBRAS",
  descricao_situacao_cadastral: "ATIVA",
  data_inicio_atividade: "1953-10-03",
  cnae_fiscal: 610000,
  cnae_fiscal_descricao: "Extração de petróleo e gás natural",
  municipio: "RIO DE JANEIRO",
  uf: "RJ",
  capital_social: 205431960490.52,
};

describe("normalizaEmpresa", () => {
  it("extrai os campos da ficha de empresa que o book pede", () => {
    const e = normalizaEmpresa(AMOSTRA);
    expect(e.cnpj).toBe("33000167000101");
    expect(e.razao_social).toBe("PETROLEO BRASILEIRO S A PETROBRAS");
    expect(e.nome_fantasia).toBe("PETROBRAS");
    expect(e.situacao).toBe("ATIVA");
    expect(e.data_abertura).toBe("1953-10-03");
    expect(e.cnae_principal).toBe("610000");
    expect(e.municipio).toBe("RIO DE JANEIRO");
    expect(e.uf).toBe("RJ");
    expect(e.capital_social).toBe(205431960490.52);
  });

  it("campo ausente vira null, não string vazia", () => {
    const e = normalizaEmpresa({ cnpj: "33000167000101", razao_social: "ACME LTDA" });
    expect(e.nome_fantasia).toBeNull();
    expect(e.situacao).toBeNull();
    expect(e.municipio).toBeNull();
  });

  /**
   * ⚠️ O caso que o projeto anterior ensinou. `capital_social` ausente NÃO pode
   * virar 0: zero é uma afirmação — "esta empresa tem capital zero" — e ninguém
   * mediu isso. Null é a verdade: não informado.
   */
  it("capital ausente vira null, JAMAIS zero", () => {
    const e = normalizaEmpresa({ cnpj: "33000167000101", razao_social: "ACME LTDA" });
    expect(e.capital_social).toBeNull();
    expect(e.capital_social).not.toBe(0);
  });

  it("string vazia da fonte também vira null — vazio não é valor", () => {
    const e = normalizaEmpresa({
      cnpj: "33000167000101",
      razao_social: "ACME LTDA",
      nome_fantasia: "   ",
      uf: "",
    });
    expect(e.nome_fantasia).toBeNull();
    expect(e.uf).toBeNull();
  });

  it("recusa a resposta quando não há CNPJ ou razão social — não é empresa", () => {
    expect(() => normalizaEmpresa({ razao_social: "SEM CNPJ" })).toThrow();
    expect(() => normalizaEmpresa({ cnpj: "33000167000101" })).toThrow();
  });

  it("recusa CNPJ inválido vindo da fonte — fonte também erra", () => {
    expect(() => normalizaEmpresa({ cnpj: "11111111111111", razao_social: "X" })).toThrow();
  });

  it("aceita cnae numérico ou texto, e devolve sempre texto", () => {
    expect(normalizaEmpresa({ ...AMOSTRA, cnae_fiscal: "6100-0/00" }).cnae_principal).toBe(
      "6100-0/00",
    );
  });
});
