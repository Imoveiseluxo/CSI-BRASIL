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

/**
 * A camada de referência: base pública, igual para todos, somente-leitura.
 *
 * ⚠️ **É uma exceção deliberada à regra absoluta** (`toda tabela de domínio tem
 * organization_id`), aberta em 20/08/2026 para a base de CNPJ da Receita: são
 * dezenas de GB idênticos para todo cliente, e duplicá-los por organização não
 * traria isolamento nenhum, só custo.
 *
 * ⚠️ **Exceção aberta sem trava vira buraco.** Por isso ela é estreita — só o
 * prefixo — e vem acompanhada do teste seguinte, que proíbe qualquer política
 * de escrita nessas tabelas. Sem esse par, "sem organization_id" viraria a
 * porta de entrada para dado de cliente sem isolamento.
 */
const PREFIXO_REFERENCIA = "rf_";
const ehReferencia = (nome: string) => nome.startsWith(PREFIXO_REFERENCIA);

function migrations(): { arquivo: string; sql: string }[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ arquivo: f, sql: readFileSync(join(DIR, f), "utf8") }));
}

/**
 * Remove comentários de linha (`--`) para as checagens que buscam COMANDO.
 *
 * ⚠️ Não usar isto nas checagens de `@classe`: a declaração de classe vive
 * justamente num comentário.
 */
function semComentarios(sql: string): string {
  return sql
    .split("\n")
    .map((linha) => linha.replace(/--.*$/, ""))
    .join("\n");
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
        if (ISENTAS.has(nome) || ehReferencia(nome)) continue;
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
        // ⚠️ Regex, e não `includes` de texto literal. A primeira versão casava
        // a frase exata e reprovou nove tabelas só porque o SQL estava alinhado
        // com espaços a mais. Guarda que dá alarme falso ensina a contornar a
        // guarda — e o contorno mais fácil é justamente afrouxá-la.
        const esperado = new RegExp(
          `alter\\s+table\\s+(?:public\\.)?["']?${nome}["']?\\s+enable\\s+row\\s+level\\s+security`,
        );
        if (!esperado.test(baixo)) faltando.push(`${arquivo}:${nome}`);
      }
    }
    expect(faltando, `tabelas sem RLS: ${faltando.join(", ")}`).toEqual([]);
  });

  test("ninguém usa FORCE ROW LEVEL SECURITY", () => {
    // FORCE + helper `security definer` = recursão infinita. ENABLE é suficiente,
    // e essa lição custou um apagão de permissão no projeto anterior.
    //
    // ⚠️ Comentário não é código. A primeira versão deste teste procurava a frase
    // no arquivo inteiro e reprovou a migration `0001_organizations.sql` por causa
    // do COMENTÁRIO que avisa "NUNCA usar FORCE ROW LEVEL SECURITY". Uma trava que
    // proíbe documentar o próprio perigo ensina a não documentar — e a documentação
    // é o que impede a próxima pessoa de cair.
    const culpados = migrations()
      .filter(({ sql }) => /force\s+row\s+level\s+security/i.test(semComentarios(sql)))
      .map(({ arquivo }) => arquivo);
    expect(culpados, `migrations com FORCE RLS: ${culpados.join(", ")}`).toEqual([]);
  });

  test("a exceção da camada de referência não vira porta de escrita", () => {
    // ⚠️ Este é o teste que PAGA pela exceção do `rf_`. Sem `organization_id`,
    // a única coisa que impede aquela tabela de virar depósito de dado de
    // cliente sem isolamento é não existir caminho de escrita para quem usa o
    // aplicativo. Se alguém acrescentar uma política de escrita ali, isso tem
    // de ficar vermelho no mesmo minuto.
    const problemas: string[] = [];
    for (const { arquivo, sql } of migrations()) {
      const criaReferencia = tabelasCriadas(sql).some(({ nome }) => ehReferencia(nome));
      if (!criaReferencia) continue;
      const limpo = semComentarios(sql).toLowerCase();

      // Política de escrita, em qualquer forma. `for all` inclui escrita.
      if (/create\s+policy[\s\S]*?\bfor\s+(insert|update|delete|all)\b/.test(limpo)) {
        problemas.push(`${arquivo}: política de escrita numa migration de camada de referência`);
      }
      // E o direito tem de ser tirado na marra, não só pela ausência de política.
      if (!/revoke\s+insert,\s*update,\s*delete/.test(limpo)) {
        problemas.push(`${arquivo}: falta revogar insert/update/delete de authenticated e anon`);
      }
    }
    expect(problemas, problemas.join(" | ")).toEqual([]);
  });

  test("só o prefixo rf_ pode dispensar organization_id", () => {
    // ⚠️ Guarda da guarda. Sem isto, bastaria alguém chamar uma tabela de
    // cliente de `rf_alguma_coisa` para ela escapar do isolamento. O prefixo é
    // um contrato: quem o usa está afirmando "isto é base pública, igual para
    // todos, somente-leitura".
    const suspeitas: string[] = [];
    for (const { arquivo, sql } of migrations()) {
      for (const { nome, corpo } of tabelasCriadas(sql)) {
        if (!ehReferencia(nome)) continue;
        if (/\borganization_id\b/.test(corpo)) {
          suspeitas.push(
            `${arquivo}:${nome} — tem organization_id, então não é camada de referência; tire o prefixo rf_`,
          );
        }
      }
    }
    expect(suspeitas, suspeitas.join(" | ")).toEqual([]);
  });
});
