-- Fundação multi-tenant do CSI Brasil.
--
-- Decisão do dono (19/08/2026): o produto é uma PLATAFORMA OPERADA, vendendo
-- acesso. Logo, tenant é a primeira entidade do modelo, como o book manda, e
-- toda tabela de domínio daqui em diante carrega organization_id + RLS.
--
-- ⚠️ ESTA MIGRATION AINDA NÃO FOI APLICADA (19/08/2026). Não existe projeto
-- Supabase. O dono assumiu a dívida de propósito: escrever agora, aplicar
-- depois. Ver docs/PENDENCIAS.md, item 19 — inclusive a consulta de conferência
-- que precisa rodar DEPOIS de aplicar, porque "aplicou" e "funciona" são coisas
-- diferentes.

-- @classe: configuracao
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- @classe: configuracao
create table public.memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('owner','admin','analyst','viewer')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
alter table public.memberships enable row level security;

-- ⚠️ `security definer` + `set row_security = off` são os DOIS necessários.
-- Sem o segundo, a consulta interna reaplica a RLS de memberships e entra em
-- recursão infinita. E NUNCA usar FORCE ROW LEVEL SECURITY junto: mesma causa.
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(p_org uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.role = any(p_roles)
  );
$$;

-- ⚠️ Revogar de `public` e `anon` ANTES de conceder a `authenticated`. Função
-- `security definer` acessível ao papel anônimo é um caminho para ler dado de
-- qualquer organização sem sessão.
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.has_org_role(uuid, text[]) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

create policy "membro lê a própria organização" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy "membro lê os membros da própria organização" on public.memberships
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "dono e admin gerenciam membros" on public.memberships
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']))
  with check (public.has_org_role(organization_id, array['owner','admin']));

create index on public.memberships (organization_id, user_id);
