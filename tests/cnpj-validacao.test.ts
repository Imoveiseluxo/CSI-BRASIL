/**
 * Validação de CNPJ — dígito verificador.
 *
 * ⚠️ Existe para **rejeitar antes de consultar**. CNPJ inválido não pode virar
 * chamada externa nem evidência: gasta cota da fonte, polui a auditoria e cria
 * evidência de uma pergunta que nunca deveria ter sido feita.
 */
import { describe, expect, it } from "vitest";
import { digitosDoCnpj, ehCnpjValido } from "@/lib/sources/cnpj-validacao";

describe("ehCnpjValido", () => {
  it("aceita CNPJ real — Banco do Brasil", () => {
    expect(ehCnpjValido("00000000000191")).toBe(true);
  });

  it("aceita CNPJ real — Petrobras", () => {
    expect(ehCnpjValido("33000167000101")).toBe(true);
  });

  it("aceita com pontuação, como a pessoa digita", () => {
    expect(ehCnpjValido("33.000.167/0001-01")).toBe(true);
  });

  it("recusa quando o dígito verificador não bate", () => {
    expect(ehCnpjValido("33000167000102")).toBe(false);
  });

  /**
   * ⚠️ Todos os dígitos iguais passam na conta do verificador e são inválidos
   * na vida real. É o caso que quase todo validador ingênuo deixa passar — e
   * `00000000000000` seria consultado, gastaria cota e viraria evidência.
   */
  it("recusa todos os dígitos iguais, que passam na conta mas não existem", () => {
    for (const d of "0123456789") {
      expect(ehCnpjValido(d.repeat(14)), `${d.repeat(14)} deveria ser inválido`).toBe(false);
    }
  });

  it("recusa comprimento errado", () => {
    expect(ehCnpjValido("3300016700010")).toBe(false);
    expect(ehCnpjValido("330001670001010")).toBe(false);
    expect(ehCnpjValido("")).toBe(false);
  });

  it("recusa texto que não tem 14 dígitos", () => {
    expect(ehCnpjValido("nao é cnpj")).toBe(false);
    expect(ehCnpjValido("33.000.167/0001-0X")).toBe(false);
  });
});

describe("digitosDoCnpj", () => {
  it("devolve só os dígitos, para virar chave de consulta", () => {
    expect(digitosDoCnpj("33.000.167/0001-01")).toBe("33000167000101");
  });

  it("devolve null quando não é CNPJ válido — não existe 'meio válido'", () => {
    expect(digitosDoCnpj("33000167000102")).toBeNull();
    expect(digitosDoCnpj("11111111111111")).toBeNull();
  });
});
