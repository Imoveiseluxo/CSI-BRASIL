/**
 * A ingestão, com banco e rede controlados.
 *
 * ⚠️ Nasceu de um erro real: a primeira versão exigia uma fonte cadastrada à mão
 * e falhava com *"Nenhuma fonte cadastrada para registrar a evidência"* na
 * primeira consulta que o dono fez. Desenho errado — obrigar cadastro manual
 * para algo que o sistema já sabe.
 */
import { afterEach, describe, expect, it } from "vitest";
import { ingereCnpj } from "@/lib/companies/ingest";

const CNPJ = "33000167000101";
const RESPOSTA = { cnpj: CNPJ, razao_social: "PETROLEO BRASILEIRO S A PETROBRAS" };
const original = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = original;
});

function fingeRede() {
  globalThis.fetch = (async () =>
    ({ ok: true, status: 200, json: async () => RESPOSTA }) as unknown as Response) as typeof fetch;
}

/** Banco de mentira que registra o que foi chamado, na ordem. */
function fingeBanco(falhaEm?: "evidence" | "companies") {
  const chamadas: string[] = [];
  const cliente = {
    from(tabela: string) {
      const resultado = (id: string) => ({
        select: () => ({
          single: async () =>
            falhaEm === tabela
              ? { data: null, error: { message: `falha em ${tabela}` } }
              : { data: { id }, error: null },
        }),
      });
      return {
        upsert: (_v: unknown, _o?: unknown) => {
          chamadas.push(`upsert:${tabela}`);
          return resultado(`${tabela}-id`);
        },
        insert: (_v: unknown) => {
          chamadas.push(`insert:${tabela}`);
          return resultado(`${tabela}-id`);
        },
      };
    },
  };
  return { cliente, chamadas };
}

describe("ingereCnpj", () => {
  it("resolve a fonte sozinha — não exige cadastro manual", async () => {
    fingeRede();
    const { cliente, chamadas } = fingeBanco();
    // biome-ignore lint/suspicious/noExplicitAny: banco de mentira, só para o teste
    const r = await ingereCnpj(cliente as any, "org-1", CNPJ);

    expect(r.ok, r.ok ? "" : r.motivo).toBe(true);
    expect(chamadas[0]).toBe("upsert:sources");
  });

  /**
   * ⚠️ A ordem não é estética. Se a empresa fosse gravada antes da evidência e a
   * evidência falhasse, sobraria uma empresa apontando para nada — procedência
   * que mente. O contrário deixa a evidência sozinha, que é verdadeira e
   * recuperável.
   */
  it("grava a evidência ANTES da empresa", async () => {
    fingeRede();
    const { cliente, chamadas } = fingeBanco();
    // biome-ignore lint/suspicious/noExplicitAny: banco de mentira
    await ingereCnpj(cliente as any, "org-1", CNPJ);

    expect(chamadas).toEqual(["upsert:sources", "insert:evidence", "upsert:companies"]);
  });

  it("CNPJ inválido não toca no banco", async () => {
    fingeRede();
    const { cliente, chamadas } = fingeBanco();
    // biome-ignore lint/suspicious/noExplicitAny: banco de mentira
    const r = await ingereCnpj(cliente as any, "org-1", "11111111111111");

    expect(r.ok).toBe(false);
    expect(chamadas).toEqual([]);
  });

  it("quando a empresa falha, a evidência já foi gravada e FICA", async () => {
    fingeRede();
    const { cliente, chamadas } = fingeBanco("companies");
    // biome-ignore lint/suspicious/noExplicitAny: banco de mentira
    const r = await ingereCnpj(cliente as any, "org-1", CNPJ);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("Evidência guardada");
    expect(chamadas).toContain("insert:evidence");
  });
});
