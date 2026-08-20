/**
 * A raiz do CNPJ — os 8 primeiros dígitos.
 *
 * ⚠️ A base da Receita organiza empresas e sócios pela RAIZ. Procurar pelo CNPJ
 * completo não acha nada, e "não achou" na tela é indistinguível de "não
 * existe" — a rede passaria a mentir por omissão para toda empresa consultada
 * com o número inteiro, que é como todo mundo digita.
 */
import { describe, expect, it } from "vitest";
import { raizDoCnpj } from "@/lib/rede/queries";

describe("raizDoCnpj", () => {
  it("aceita o CNPJ completo, com ou sem pontuação, e devolve a raiz", () => {
    expect(raizDoCnpj("58.182.400/0001-45")).toBe("58182400");
    expect(raizDoCnpj("58182400000145")).toBe("58182400");
    expect(raizDoCnpj(" 58 182 400 0001 45 ")).toBe("58182400");
  });

  it("aceita a raiz já sozinha", () => {
    expect(raizDoCnpj("58182400")).toBe("58182400");
  });

  it("recusa o que não tem tamanho de CNPJ, em vez de cortar e fingir", () => {
    // ⚠️ Cortar os 8 primeiros de qualquer coisa devolveria uma raiz plausível
    // para um número errado — e a tela mostraria a rede da empresa errada.
    for (const errado of ["", "123", "5818240", "581824000001456", "abcdefgh"]) {
      expect(raizDoCnpj(errado), `deveria recusar: ${errado}`).toBeNull();
    }
  });

  it("filial e matriz têm a MESMA raiz — é assim que a base é organizada", () => {
    expect(raizDoCnpj("33000167000101")).toBe(raizDoCnpj("33000167000234"));
  });
});
