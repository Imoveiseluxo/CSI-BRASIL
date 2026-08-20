/**
 * ⚠️ Os papéis vivem AQUI, e não em `types/supabase.ts`, porque o banco usa
 * `text` + CHECK e não um enum do Postgres — então o tipo gerado do banco não
 * traz a lista. Consequência: a lista existe em dois lugares, e **duas listas
 * podem divergir sem ninguém ver**.
 *
 * Por isso existe `tests/papeis-batem-com-o-banco.test.ts`, que compara esta
 * lista com o CHECK da migration e reprova se saírem de sincronia.
 */
export const PAPEIS = ["owner", "admin", "analyst", "viewer"] as const;
export type OrgRole = (typeof PAPEIS)[number];

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

/**
 * O banco guarda o papel como `text` + CHECK, então o tipo gerado dele é
 * `string`. **Estreitar aqui, e não com asserção de tipo.**
 *
 * ⚠️ A diferença não é estética. Asserção diz ao compilador "confie em mim" e
 * some com o problema; esta função **verifica**, e um papel desconhecido no
 * banco — inserido à mão, sobrevivente de uma migration futura — vira erro
 * visível em vez de virar acesso silencioso.
 */
export function ehPapelValido(v: string): v is OrgRole {
  return (PAPEIS as readonly string[]).includes(v);
}

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
