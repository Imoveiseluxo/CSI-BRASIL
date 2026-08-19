import type { OrgRole } from "@/types/supabase";

export type { OrgRole };

/**
 * A matriz de papéis — **lógica pura, sem banco**, para poder ser testada sem
 * infraestrutura nenhuma.
 *
 * Extraída do Bahia Realty, onde ela é a fonte única consumida pela barra
 * lateral, pela guarda de página e pelas ações de servidor. Ter três lugares
 * decidindo acesso é como um deles fica para trás.
 *
 * ⚠️ **Negar é o padrão.** Seção que não está no mapa abaixo não é "liberada por
 * enquanto": ela não existe para `canAccess`, e o acesso é recusado. No projeto
 * anterior, o oposto — liberar o que não estava listado — foi o que fez cinco
 * telas parecerem desprotegidas numa auditoria e consumirem um dia de
 * investigação para descobrir que eram falso positivo.
 */
export type AppSection = "projetos" | "monitores" | "membros" | "workspace" | "integracoes";

export const SECTION_ACCESS: Record<AppSection, OrgRole[]> = {
  projetos: ["owner", "admin", "analyst", "viewer"],
  monitores: ["owner", "admin", "analyst"],
  membros: ["owner", "admin"],
  workspace: ["owner"],
  integracoes: ["owner", "admin"],
};

/** Recusa por padrão: seção desconhecida devolve `false`, nunca `true`. */
export function canAccess(role: OrgRole, section: AppSection): boolean {
  const permitidos = SECTION_ACCESS[section];
  if (!permitidos) return false;
  return permitidos.includes(role);
}

/** Rótulos para a interface. PT-BR na tela, inglês no código. */
export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Dono",
  admin: "Administrador",
  analyst: "Analista",
  viewer: "Leitor",
};
