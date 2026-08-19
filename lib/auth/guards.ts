import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type AppSection, canAccess } from "@/lib/auth/permissions";
import { getOrgBySlug, getUserOrgs } from "@/lib/orgs/queries";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/types/supabase";

/**
 * As guardas de acesso — a **segunda** camada.
 *
 * Extraídas do Bahia Realty. A primeira camada é a RLS, no banco: mesmo que uma
 * consulta esqueça o filtro, a regra do banco corta. Estas guardas decidem o que
 * a pessoa **vê na navegação**; não são o que impede o dado de vazar.
 *
 * ⚠️ Confundir as duas é o erro caro. No projeto anterior a tela de leads é
 * guardada só por `requireOrgMember` — o piso — porque quem separa um corretor
 * do outro é a RLS. Quem lesse só a guarda concluiria que a tela estava aberta.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** O piso: pertence a esta organização? */
export async function requireOrgMember(opts: { orgSlug: string }) {
  const user = await requireUser();
  const vinculo = await getOrgBySlug(opts.orgSlug, user.id);

  if (!vinculo) {
    const todas = await getUserOrgs(user.id);
    if (todas.length === 0) redirect("/onboarding");
    redirect(`/app/${todas[0]!.organization.slug}`);
  }

  return { user, org: vinculo.organization, role: vinculo.role };
}

/** Papel específico. Use quando a regra for de papel, não de seção. */
export async function requireOrgRole(opts: { orgSlug: string; roles: OrgRole[] }) {
  const ctx = await requireOrgMember({ orgSlug: opts.orgSlug });
  if (!opts.roles.includes(ctx.role)) {
    redirect(`/app/${opts.orgSlug}`);
  }
  return ctx;
}

/**
 * Acesso a uma SEÇÃO, pela matriz central de `permissions.ts`.
 *
 * Prefira esta a `requireOrgRole` com lista solta: lista solta espalhada por
 * dezenas de páginas é como uma delas fica para trás quando um papel muda.
 */
export async function requireSection(opts: { orgSlug: string; section: AppSection }) {
  const ctx = await requireOrgMember({ orgSlug: opts.orgSlug });
  if (!canAccess(ctx.role, opts.section)) {
    redirect(`/app/${opts.orgSlug}`);
  }
  return ctx;
}
