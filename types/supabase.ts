/**
 * ⚠️ ARQUIVO PROVISÓRIO — 19/08/2026.
 *
 * No Bahia Realty este arquivo é **gerado** do banco (`npm run types`). Aqui o
 * banco ainda não existe: as migrations da Fase 1 não foram aplicadas, e o
 * projeto Supabase é decisão de infraestrutura ainda em aberto.
 *
 * Este esboço declara **só** o que o encanamento extraído precisa para tipar, e
 * existe para que `tsc --noEmit` passe sem `any`. **Ele não descreve o banco** —
 * descreve o que o código espera do banco.
 *
 * ⚠️ **No dia em que o banco existir, este arquivo é SUBSTITUÍDO pelo gerado**,
 * não editado à mão. Editar à mão cria a pior classe de erro possível: o tipo
 * diz uma coisa, o banco tem outra, e o TypeScript garante a mentira.
 */

/** Papéis do CSI Brasil. Menos papéis que o projeto anterior, de propósito:
 *  papel só entra quando existe uma tela que ele precisa e outra que ele não
 *  pode ver. Papel sem consequência é campo que ninguém preenche. */
export type OrgRole = "owner" | "admin" | "analyst" | "viewer";

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrgRole;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      org_role: OrgRole;
    };
  };
};
