/**
 * O conector, com `fetch` controlado — sem rede.
 *
 * ⚠️ Testar o conector contra a internet de verdade seria testar a internet:
 * falha por indisponibilidade da fonte, fica lento, e não prova nada sobre a
 * nossa lógica. O que precisa ser provado aqui é: **quem é chamado, quando não
 * é chamado ninguém, e o que acontece quando a fonte responde mal.**
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { consultaCnpj, hashDoConteudo } from "@/lib/sources/cnpj";

const CNPJ = "33000167000101";
const RESPOSTA = { cnpj: CNPJ, razao_social: "PETROLEO BRASILEIRO S A PETROBRAS" };

function fingeFetch(respostas: Array<{ ok: boolean; status?: number; body?: unknown } | "erro">): {
  chamadas: string[];
  restaurar: () => void;
} {
  const chamadas: string[] = [];
  let i = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async (entrada: string | URL) => {
    chamadas.push(String(entrada));
    const r = respostas[Math.min(i++, respostas.length - 1)] ?? "erro";
    if (r === "erro") throw new Error("rede caiu");
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 500),
      json: async () => r.body,
    } as unknown as Response;
  }) as typeof fetch;
  return { chamadas, restaurar: () => (globalThis.fetch = original) };
}

afterEach(() => vi.restoreAllMocks());

describe("consultaCnpj", () => {
  it("consulta o primeiro provedor e devolve o artefato cru com hash", async () => {
    const f = fingeFetch([{ ok: true, body: RESPOSTA }]);
    const r = await consultaCnpj("33.000.167/0001-01");
    f.restaurar();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.coleta.provedor.nome).toBe("Minha Receita");
    expect(r.coleta.conteudo).toEqual(RESPOSTA);
    expect(r.coleta.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(f.chamadas).toHaveLength(1);
    expect(f.chamadas[0]).toContain("minhareceita.org");
    expect(r.coleta.recusasAnteriores).toEqual([]);
  });

  /**
   * ⚠️ O teste mais importante do arquivo. CNPJ inválido não pode gastar cota
   * da fonte, e não pode virar evidência de uma pergunta que nunca deveria ter
   * sido feita. A prova não é a mensagem — é `fetch` **não ter sido chamado**.
   */
  it("CNPJ inválido não chega a fazer requisição nenhuma", async () => {
    const f = fingeFetch([{ ok: true, body: RESPOSTA }]);
    const r = await consultaCnpj("11111111111111");
    f.restaurar();

    expect(r.ok).toBe(false);
    expect(f.chamadas).toHaveLength(0);
  });

  it("cai para o provedor seguinte quando o primeiro responde mal", async () => {
    const f = fingeFetch([
      { ok: false, status: 429 },
      { ok: true, body: RESPOSTA },
    ]);
    const r = await consultaCnpj(CNPJ);
    f.restaurar();

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.coleta.provedor.nome).toBe("BrasilAPI - CNPJ");
    expect(f.chamadas).toHaveLength(2);
    // ⚠️ A falha do primeiro não pode desaparecer só porque o segundo atendeu:
    // provedor fora do ar há meses ficaria invisível e o painel, verde.
    expect(r.coleta.recusasAnteriores).toHaveLength(1);
    expect(r.coleta.recusasAnteriores[0]).toContain("429");
  });

  /**
   * ⚠️ Mensagem genérica custa rodadas de investigação — foi o que manteve uma
   * campanha parada dois dias no projeto anterior. O motivo tem que dizer o que
   * CADA provedor respondeu.
   */
  it("quando todos falham, o motivo nomeia cada provedor e o que ele respondeu", async () => {
    const f = fingeFetch([{ ok: false, status: 503 }, "erro"]);
    const r = await consultaCnpj(CNPJ);
    f.restaurar();

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toContain("Minha Receita");
    expect(r.motivo).toContain("503");
    expect(r.motivo).toContain("BrasilAPI");
  });

  it("não segue redirecionamento — destino conferido não pode ser trocado no caminho", async () => {
    const capturado: RequestInit[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_u: string | URL, init?: RequestInit) => {
      capturado.push(init ?? {});
      return { ok: true, status: 200, json: async () => RESPOSTA } as unknown as Response;
    }) as typeof fetch;
    await consultaCnpj(CNPJ);
    globalThis.fetch = original;

    expect(capturado[0]?.redirect).toBe("error");
  });
});

describe("hashDoConteudo", () => {
  it("o mesmo conteúdo dá o mesmo hash, mesmo com as chaves em outra ordem", () => {
    expect(hashDoConteudo({ a: 1, b: 2 })).toBe(hashDoConteudo({ b: 2, a: 1 }));
  });

  it("conteúdo diferente dá hash diferente — senão não serve de prova", () => {
    expect(hashDoConteudo({ a: 1 })).not.toBe(hashDoConteudo({ a: 2 }));
  });
});
