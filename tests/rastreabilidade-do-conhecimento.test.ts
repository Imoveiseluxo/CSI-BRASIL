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

  test("a classe declarada é uma das duas conhecidas", () => {
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
  test("tabela de evidência não recebe policy de UPDATE nem DELETE", () => {
    const culpadas: string[] = [];
    const evidencias = todas()
      .filter((t) => t.classe === "evidencia")
      .map((t) => t.nome);
    for (const { arquivo, sql } of migrations()) {
      const baixo = sql.toLowerCase();
      for (const nome of evidencias) {
        for (const acao of ["update", "delete"]) {
          const re = new RegExp(
            `create\\s+policy[\\s\\S]{0,200}?on\\s+public\\.${nome}\\s+for\\s+${acao}`,
            "i",
          );
          if (re.test(baixo)) culpadas.push(`${arquivo}: ${acao} em ${nome}`);
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
