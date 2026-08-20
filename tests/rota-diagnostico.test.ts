/**
 * A rota de diagnóstico é PERMANENTE (decisão do dono, 19/08/2026). Rota
 * permanente que dispara requisição externa precisa ter o comportamento de
 * segurança travado por teste — não por lembrança.
 *
 * ⚠️ O caso que mais importa é o primeiro: **sem segredo configurado, ela
 * responde 503, não 200**. Falhar fechado é o que impede que uma variável
 * esquecida num ambiente novo transforme a rota numa porta aberta.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/diagnostico/cnpj/route";

const SEGREDO = "segredo-de-teste";
const CNPJ = "33000167000101";
const original = { fetch: globalThis.fetch, env: process.env.DIAGNOSTICO_SECRET };

function pedido(headers: Record<string, string> = {}, cnpj = CNPJ): Request {
  return new Request(`https://x.test/api/diagnostico/cnpj?cnpj=${cnpj}`, { headers });
}

beforeEach(() => {
  process.env.DIAGNOSTICO_SECRET = SEGREDO;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ cnpj: CNPJ, razao_social: "ACME LTDA" }),
    }) as unknown as Response) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = original.fetch;
  if (original.env === undefined) delete process.env.DIAGNOSTICO_SECRET;
  else process.env.DIAGNOSTICO_SECRET = original.env;
});

describe("rota de diagnóstico", () => {
  /**
   * ⚠️ Sem variável configurada, a rota tem que FECHAR. Se ela abrisse,
   * qualquer ambiente novo — preview, um deploy de teste — nasceria com um
   * endpoint público que consulta em nosso nome e gasta nossa cota.
   */
  it("sem segredo configurado responde 503 — fechada, nunca aberta", async () => {
    delete process.env.DIAGNOSTICO_SECRET;
    const r = await GET(pedido({ authorization: `Bearer ${SEGREDO}` }));
    expect(r.status).toBe(503);
  });

  it("sem cabeçalho de autorização responde 401", async () => {
    const r = await GET(pedido());
    expect(r.status).toBe(401);
  });

  it("com segredo errado responde 401", async () => {
    const r = await GET(pedido({ authorization: "Bearer outro" }));
    expect(r.status).toBe(401);
  });

  it("com o segredo certo consulta e devolve a empresa normalizada", async () => {
    const r = await GET(pedido({ authorization: `Bearer ${SEGREDO}` }));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { ok: boolean; normalizada: { razao_social: string } };
    expect(corpo.ok).toBe(true);
    expect(corpo.normalizada.razao_social).toBe("ACME LTDA");
  });

  it("sem ?cnpj= responde 400, e não sai consultando nada", async () => {
    let chamou = false;
    globalThis.fetch = (async () => {
      chamou = true;
      return {} as Response;
    }) as typeof fetch;
    const r = await GET(
      new Request("https://x.test/api/diagnostico/cnpj", {
        headers: { authorization: `Bearer ${SEGREDO}` },
      }),
    );
    expect(r.status).toBe(400);
    expect(chamou).toBe(false);
  });
});
