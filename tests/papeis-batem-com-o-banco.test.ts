import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PAPEIS } from "@/lib/auth/permissions";

/**
 * A lista de papéis existe em DOIS lugares: em `lib/auth/permissions.ts` e no
 * CHECK da migration. Isso não foi escolha — é consequência de o banco usar
 * `text` + CHECK em vez de um enum do Postgres, e por isso o tipo gerado do
 * banco não traz a lista.
 *
 * ⚠️ **Duas listas divergem em silêncio.** Alguém acrescenta `gerente` no CHECK
 * e esquece o código: o papel existe no banco, ninguém consegue usá-lo, e a
 * pessoa com esse papel fica sem acesso a nada sem que nada quebre. Ou o
 * contrário: acrescenta no código, e o `insert` é recusado pelo banco com uma
 * mensagem que ninguém relaciona à causa.
 *
 * Este teste é a costura entre os dois.
 */
const MIGRATION = join(process.cwd(), "supabase/migrations/0001_organizations.sql");

describe("papéis do código batem com o CHECK do banco", () => {
  it("a lista do código é exatamente a do CHECK da migration", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const trecho = sql.match(/role\s+text\s+not\s+null\s+check\s*\(\s*role\s+in\s*\(([^)]*)\)/i);
    expect(trecho, "não achei o CHECK de `role` na migration 0001").not.toBeNull();

    const noBanco = (trecho?.[1] ?? "")
      .split(",")
      .map((p) => p.trim().replace(/^'|'$/g, ""))
      .filter(Boolean)
      .sort();

    expect(noBanco, "o CHECK da migration veio vazio").not.toHaveLength(0);
    expect(noBanco).toEqual([...PAPEIS].sort());
  });
});
