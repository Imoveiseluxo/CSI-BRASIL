/**
 * O trecho destacado da busca.
 *
 * ⚠️ O que este teste protege de verdade **não é o destaque, é o texto**: uma
 * quebra malfeita pode fazer parte do resultado sumir da tela sem erro nenhum.
 * Perder texto em silêncio é exatamente o modo de falha que este projeto já
 * levou em outro lugar — some, ninguém vê, e a tela continua parecendo certa.
 */
import { describe, expect, it } from "vitest";
import { pedacosDoTrecho } from "@/lib/busca/queries";

const A = String.fromCharCode(2); // StartSel
const F = String.fromCharCode(3); // StopSel

/** O texto todo, juntando os pedaços — nada pode ter sumido no caminho. */
const inteiro = (t: string | null) =>
  pedacosDoTrecho(t)
    .map((p) => p.texto)
    .join("");

describe("pedacosDoTrecho", () => {
  it("separa o que casou do que não casou", () => {
    expect(pedacosDoTrecho(`PETROLEO ${A}BRASILEIRO${F} SA`)).toEqual([
      { texto: "PETROLEO ", marcado: false },
      { texto: "BRASILEIRO", marcado: true },
      { texto: " SA", marcado: false },
    ]);
  });

  it("marca mais de um pedaço na mesma frase", () => {
    const r = pedacosDoTrecho(`${A}SAO${F} JOSE DOS ${A}CAMPOS${F}`);
    expect(r.filter((p) => p.marcado).map((p) => p.texto)).toEqual(["SAO", "CAMPOS"]);
  });

  it("não perde texto quando o marcador de fechamento foi cortado", () => {
    // ts_headline corta por número de palavras; a marca pode ficar sem par.
    const t = `INDUSTRIA ${A}QUIMICA DO NORDESTE`;
    expect(inteiro(t)).toBe("INDUSTRIA QUIMICA DO NORDESTE");
  });

  it("preserva o texto inteiro em qualquer combinação", () => {
    for (const t of [
      "SEM MARCA NENHUMA",
      `${A}TUDO MARCADO${F}`,
      `${A}INICIO${F} meio ${A}fim${F}`,
      `resto ${F} solto`,
    ]) {
      expect(inteiro(t)).toBe(t.split(A).join("").split(F).join(""));
    }
  });

  it("devolve vazio quando não há trecho (evidência não tem)", () => {
    expect(pedacosDoTrecho(null)).toEqual([]);
    expect(pedacosDoTrecho("")).toEqual([]);
  });

  it("não devolve pedaço vazio, que viraria elemento à toa na tela", () => {
    const r = pedacosDoTrecho(`${A}SAO${F}${A}PAULO${F}`);
    expect(r.every((p) => p.texto.length > 0)).toBe(true);
  });
});
