import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Segunda trava do projeto (Book v2): tabela que guarda conhecimento derivado
 * precisa dizer **de onde aquilo veio**. Ver `docs/CONTRATO-DE-PROCEDENCIA.md`.
 *
 * ⚠️ A trava age sobre a DECLARAÇÃO, não sobre adivinhação de nome. Um teste que
 * tentasse deduzir a classe pelo nome da tabela erraria nos dois sentidos e daria
 * falsa segurança — pior que não ter trava.
 *
 * ⚠️ Limite conhecido: a leitura é por expressão regular sobre o SQL, e associa a
 * declaração ao `create table` mais próximo abaixo dela. Ela não entende SQL de
 * verdade. Quem prova que a trava funciona é o passo de quebrar de propósito,
 * não a leitura deste código.
 */
const DIR = join(process.cwd(), "supabase/migrations");

const COLUNAS_DE_PROCEDENCIA = [
  "source_id",
  "evidence_id",
  "transform_id",
  "produced_by_kind",
  "produced_by",
  "produced_at",
  "confidence",
] as const;

const COLUNAS_DE_EVIDENCIA = [
  "source_id",
  "collected_at",
  "content_hash",
  "collected_by_kind",
] as const;

const CLASSES = new Set(["configuracao", "evidencia", "conhecimento"]);

type Tabela = { arquivo: string; nome: string; classe: string | null; corpo: string };

function migrations(): { arquivo: string; sql: string }[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ arquivo: f, sql: readFileSync(join(DIR, f), "utf8") }));
}

function tabelas(sql: string, arquivo: string): Tabela[] {
  const re =
    /(?:--\s*@classe:\s*(\w+)[^\n]*\n(?:\s*--[^\n]*\n)*)?create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-z_0-9]+)["']?\s*\(([\s\S]*?)\n\)\s*;/gi;
  return [...sql.matchAll(re)].map((m) => ({
    arquivo,
    classe: (m[1] ?? null) as string | null,
    nome: m[2] as string,
    corpo: m[3] as string,
  }));
}

function todas(): Tabela[] {
  return migrations().flatMap(({ arquivo, sql }) => tabelas(sql, arquivo));
}

describe("rastreabilidade do conhecimento", () => {
  test("toda tabela declara a classe", () => {
    const semClasse = todas()
      .filter((t) => t.classe === null)
      .map((t) => `${t.arquivo}:${t.nome}`);
    expect(
      semClasse,
      `tabelas sem "-- @classe:" logo acima do create table: ${semClasse.join(", ")}`,
    ).toEqual([]);
  });

  test("a classe declarada é uma das três conhecidas", () => {
    const invalidas = todas()
      .filter((t) => t.classe !== null && !CLASSES.has(t.classe))
      .map((t) => `${t.arquivo}:${t.nome}=${t.classe}`);
    expect(invalidas, `classe desconhecida: ${invalidas.join(", ")}`).toEqual([]);
  });

  test("tabela de conhecimento carrega as colunas de procedência", () => {
    const faltando: string[] = [];
    for (const t of todas()) {
      if (t.classe !== "conhecimento") continue;
      for (const coluna of COLUNAS_DE_PROCEDENCIA) {
        if (!new RegExp(`\\b${coluna}\\b`).test(t.corpo)) {
          faltando.push(`${t.arquivo}:${t.nome} sem ${coluna}`);
        }
      }
    }
    expect(faltando, faltando.join(" | ")).toEqual([]);
  });

  test("tabela de evidência carrega as colunas de captura", () => {
    const faltando: string[] = [];
    for (const t of todas()) {
      if (t.classe !== "evidencia") continue;
      for (const coluna of COLUNAS_DE_EVIDENCIA) {
        if (!new RegExp(`\\b${coluna}\\b`).test(t.corpo)) {
          faltando.push(`${t.arquivo}:${t.nome} sem ${coluna}`);
        }
      }
    }
    expect(faltando, faltando.join(" | ")).toEqual([]);
  });

  /**
   * ⚠️ Evidência que pode ser reescrita não é evidência. A trava confere que
   * ninguém criou policy de UPDATE ou DELETE sobre tabela de evidência — é a
   * mesma regra de `query_versions`, e é o alicerce do Evidence Vault da Fase 7.
   */
  test("tabela de evidência não recebe policy de UPDATE, DELETE nem ALL", () => {
    const culpadas: string[] = [];
    const evidencias = new Set(
      todas()
        .filter((t) => t.classe === "evidencia")
        .map((t) => t.nome),
    );
    for (const { arquivo, sql } of migrations()) {
      // ⚠️ Fatiar por `create policy` em vez de casar com uma janela de N
      // caracteres. A primeira versão deste teste usava `[\s\S]{0,200}?`, e uma
      // policy com nome longo ou comentário no meio escapava da checagem — a
      // trava passaria verde sobre exatamente o que ela existe para impedir.
      const pedacos = sql
        .toLowerCase()
        .split(/create\s+policy/i)
        .slice(1);
      for (const pedaco of pedacos) {
        const alvo = pedaco.match(/\bon\s+(?:public\.)?["']?([a-z_0-9]+)["']?/);
        if (!alvo || !evidencias.has(alvo[1] as string)) continue;
        const acao = pedaco.match(/\bfor\s+(all|update|delete|insert|select)\b/);
        const verbo = acao?.[1] ?? "all"; // `for` ausente no Postgres significa ALL
        if (verbo === "update" || verbo === "delete" || verbo === "all") {
          culpadas.push(`${arquivo}: ${verbo} em ${alvo[1]}`);
        }
      }
    }
    expect(culpadas, `evidência com policy de escrita: ${culpadas.join(", ")}`).toEqual([]);
  });

  /**
   * ⚠️ O caso que mais importa. `default 1` é o jeito mais natural de escrever, e
   * produz exatamente o campo que ninguém preencheu com um número que parece
   * medido — o erro que no projeto anterior deixou painéis pendurados em zero.
   */
  test("confidence não nasce com default nem not null", () => {
    const culpadas: string[] = [];
    for (const t of todas()) {
      if (t.classe !== "conhecimento") continue;
      const linha = t.corpo.split("\n").find((l) => /\bconfidence\b/.test(l)) ?? "";
      if (/default/i.test(linha) || /not\s+null/i.test(linha)) {
        culpadas.push(`${t.arquivo}:${t.nome}`);
      }
    }
    expect(culpadas, `confidence com default ou not null: ${culpadas.join(", ")}`).toEqual([]);
  });
});
