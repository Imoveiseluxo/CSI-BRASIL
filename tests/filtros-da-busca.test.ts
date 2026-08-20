/**
 * Os filtros da busca — período e fonte.
 *
 * ⚠️ O que este teste protege não é a comodidade de filtrar: é a **regra de que
 * filtro inválido não pode virar filtro impossível**. Filtrar por lixo devolve
 * zero resultados, e zero resultados é indistinguível de "não existe nada" —
 * a busca passaria a mentir por omissão, sem erro nenhum na tela.
 */
import { describe, expect, it } from "vitest";
import { desdeDoPeriodo, filtrosSchema } from "@/lib/busca/queries";

const AGORA = new Date("2026-08-20T12:00:00.000Z");

describe("desdeDoPeriodo", () => {
  it("não corta nada quando o período é 'tudo'", () => {
    expect(desdeDoPeriodo("tudo", AGORA)).toBeNull();
  });

  it("volta a quantidade certa de dias", () => {
    expect(desdeDoPeriodo("7", AGORA)).toBe("2026-08-13T12:00:00.000Z");
    expect(desdeDoPeriodo("30", AGORA)).toBe("2026-07-21T12:00:00.000Z");
    expect(desdeDoPeriodo("90", AGORA)).toBe("2026-05-22T12:00:00.000Z");
  });

  it("atravessa a virada de ano sem inventar data", () => {
    expect(desdeDoPeriodo("90", new Date("2026-02-10T00:00:00.000Z"))).toBe(
      "2025-11-12T00:00:00.000Z",
    );
  });
});

describe("filtrosSchema", () => {
  it("aceita o que a tela oferece", () => {
    const f = filtrosSchema.parse({
      periodo: "30",
      fonte: "cc000000-0000-4000-8000-0000000000ff",
    });
    expect(f).toEqual({ periodo: "30", fonte: "cc000000-0000-4000-8000-0000000000ff" });
  });

  it("sem nada na URL, não filtra", () => {
    expect(filtrosSchema.parse({})).toEqual({ periodo: "tudo", fonte: undefined });
  });

  it("período inventado na URL vira 'tudo', não filtro impossível", () => {
    expect(filtrosSchema.parse({ periodo: "9999" }).periodo).toBe("tudo");
    expect(filtrosSchema.parse({ periodo: "'; drop table companies; --" }).periodo).toBe("tudo");
  });

  it("fonte que não é um id vira 'sem filtro' em vez de quebrar a tela", () => {
    // Sem isto o Postgres receberia texto onde espera um id e devolveria erro
    // de sintaxe — mensagem técnica na cara de quem só digitou uma busca.
    expect(filtrosSchema.parse({ fonte: "a-fonte-que-eu-quiser" }).fonte).toBeUndefined();
    expect(filtrosSchema.parse({ fonte: "" }).fonte).toBeUndefined();
  });

  it("nunca joga exceção, por pior que seja a URL", () => {
    for (const entrada of [
      { periodo: null, fonte: 42 },
      { periodo: ["30"], fonte: {} },
      { periodo: undefined, fonte: null },
    ]) {
      expect(() => filtrosSchema.parse(entrada)).not.toThrow();
    }
  });
});
