/**
 * A matriz de papéis, testada sem banco.
 *
 * Ela é lógica pura de propósito: acesso é a regra que mais dói quando erra, e
 * regra que só pode ser testada com infraestrutura de pé acaba não sendo testada.
 */
import { describe, expect, it } from "vitest";
import { type AppSection, canAccess, ROLE_LABELS, SECTION_ACCESS } from "@/lib/auth/permissions";
import type { OrgRole } from "@/types/supabase";

const PAPEIS: OrgRole[] = ["owner", "admin", "analyst", "viewer"];

describe("matriz de papéis", () => {
  it("o dono alcança todas as seções", () => {
    for (const secao of Object.keys(SECTION_ACCESS) as AppSection[]) {
      expect(canAccess("owner", secao), `dono barrado em ${secao}`).toBe(true);
    }
  });

  it("o leitor não escreve em lugar nenhum — só projetos, e só para ler", () => {
    expect(canAccess("viewer", "projetos")).toBe(true);
    expect(canAccess("viewer", "monitores")).toBe(false);
    expect(canAccess("viewer", "membros")).toBe(false);
    expect(canAccess("viewer", "workspace")).toBe(false);
    expect(canAccess("viewer", "integracoes")).toBe(false);
  });

  it("só o dono mexe no workspace", () => {
    for (const papel of PAPEIS) {
      expect(canAccess(papel, "workspace")).toBe(papel === "owner");
    }
  });

  it("analista trabalha nos monitores, mas não administra membros", () => {
    expect(canAccess("analyst", "monitores")).toBe(true);
    expect(canAccess("analyst", "membros")).toBe(false);
  });

  /**
   * ⚠️ O teste mais importante do arquivo. Negar é o padrão: seção que ninguém
   * declarou não é "liberada por enquanto". Se um dia `canAccess` passar a
   * devolver `true` para o desconhecido, uma seção nova nasceria aberta para
   * todo mundo — e ninguém repararia, porque nada quebraria.
   */
  it("seção desconhecida é recusada, não liberada", () => {
    const inexistente = "secao-que-nao-existe" as AppSection;
    for (const papel of PAPEIS) {
      expect(canAccess(papel, inexistente), `${papel} entrou numa seção inexistente`).toBe(false);
    }
  });

  it("todo papel tem rótulo em português para a tela", () => {
    for (const papel of PAPEIS) {
      expect(ROLE_LABELS[papel], `papel sem rótulo: ${papel}`).toBeTruthy();
    }
  });

  /**
   * Trava contra papel fantasma: se alguém acrescentar um papel no tipo e
   * esquecer de decidir o que ele acessa, este teste mostra na hora — em vez de
   * o papel existir sem nenhuma seção e a pessoa não conseguir usar o sistema.
   */
  it("todo papel declarado aparece em pelo menos uma seção", () => {
    const semNenhuma = PAPEIS.filter(
      (papel) => !Object.values(SECTION_ACCESS).some((lista) => lista.includes(papel)),
    );
    expect(semNenhuma, `papéis sem seção nenhuma: ${semNenhuma.join(", ")}`).toEqual([]);
  });
});
