/**
 * O termo da busca precisa chegar ao banco sem acento, porque o indice guarda
 * sem acento (migration 0009).
 *
 * ⚠️ Medido contra o banco antes de existir: `to_tsvector('portuguese','SÃO
 * PAULO')` NAO casa com `websearch_to_tsquery('portuguese','sao paulo')`. Num
 * produto brasileiro, busca que erra por acento e busca que nao serve.
 */
import { describe, expect, it } from "vitest";
import { semAcento } from "@/lib/busca/queries";

describe("semAcento", () => {
  it("tira acento das formas que aparecem em nome de cidade e empresa", () => {
    expect(semAcento("São Paulo")).toBe("Sao Paulo");
    expect(semAcento("Goiânia")).toBe("Goiania");
    expect(semAcento("Brasília")).toBe("Brasilia");
    expect(semAcento("Camaçari")).toBe("Camacari");
    expect(semAcento("CONSTRUÇÕES")).toBe("CONSTRUCOES");
  });

  it("nao mexe no que ja esta sem acento", () => {
    expect(semAcento("Salvador")).toBe("Salvador");
    expect(semAcento("58182400000145")).toBe("58182400000145");
  });

  it("preserva o resto do termo, inclusive aspas do websearch", () => {
    expect(semAcento('"São Paulo" -filial')).toBe('"Sao Paulo" -filial');
  });
});
