import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * A regra dura deste projeto: toda tabela de domínio tem `organization_id` e RLS
 * habilitada. Regra escrita em documento é texto, e texto não trava nada — por
 * isso ela vive aqui, no portão.
 *
 * ⚠️ Este teste lê SQL, não o banco. Ele impede que uma migration entre errada;
 * **não** garante que o banco esteja no estado que as migrations descrevem.
 * Conferir o banco é tarefa de quem aplica — e no projeto anterior a diferença
 * entre "migration escrita" e "migration aplicada" deixou um alerta de segurança
 * no ar por dias.
 */
const DIR = join(process.cwd(), "supabase/migrations");

/** Tabelas de infraestrutura que legitimamente não pertencem a uma organização. */
const ISENTAS = new Set(["organizations"]);

function migrations(): { arquivo: string; sql: string }[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ arquivo: f, sql: readFileSync(join(DIR, f), "utf8") }));
}

/** Cada tabela criada no schema public, com o corpo entre parênteses. */
function tabelasCriadas(sql: string): { nome: string; corpo: string }[] {
  const re =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-z_0-9]+)["']?\s*\(([\s\S]*?)\n\)\s*;/gi;
  return [...sql.matchAll(re)].map((m) => ({ nome: m[1] as string, corpo: m[2] as string }));
}

describe("toda tabela de domínio é multi-tenant", () => {
  test("nenhuma tabela nasce sem organization_id", () => {
    const faltando: string[] = [];
    for (const { arquivo, sql } of migrations()) {
      for (const { nome, corpo } of tabelasCriadas(sql)) {
        if (ISENTAS.has(nome)) continue;
        // Precisa estar no CORPO da própria tabela, não em qualquer lugar do
        // arquivo: senão uma tabela sem tenant passaria de carona numa migration
        // que cria duas.
        if (!/\borganization_id\b/.test(corpo)) faltando.push(`${arquivo}:${nome}`);
      }
    }
    expect(faltando, `tabelas sem organization_id: ${faltando.join(", ")}`).toEqual([]);
  });

  test("nenhuma tabela nasce sem RLS habilitada", () => {
    const faltando: string[] = [];
    for (const { arquivo, sql } of migrations()) {
      const baixo = sql.toLowerCase();
      for (const { nome } of tabelasCriadas(sql)) {
        const esperado = `alter table public.${nome} enable row level security`;
        if (!baixo.includes(esperado)) faltando.push(`${arquivo}:${nome}`);
      }
    }
    expect(faltando, `tabelas sem RLS: ${faltando.join(", ")}`).toEqual([]);
  });

  test("ninguém usa FORCE ROW LEVEL SECURITY", () => {
    // FORCE + helper `security definer` = recursão infinita. ENABLE é suficiente,
    // e essa lição custou um apagão de permissão no projeto anterior.
    const culpados = migrations()
      .filter(({ sql }) => /force\s+row\s+level\s+security/i.test(sql))
      .map(({ arquivo }) => arquivo);
    expect(culpados, `migrations com FORCE RLS: ${culpados.join(", ")}`).toEqual([]);
  });
});
