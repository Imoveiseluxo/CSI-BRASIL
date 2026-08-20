-- Monitor: consulta persistente que observa fontes ao longo do tempo.
-- Cada alteração na consulta vira uma VERSÃO nova, nunca uma sobrescrita:
-- sem isso, mudança de resultado é atribuída ao mundo quando foi ao operador.
--
-- ⚠️ NÃO APLICADA ainda (19/08/2026) — ver docs/PENDENCIAS.md, item 19.

-- @classe: configuracao
create table public.monitors (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id      uuid not null references public.projects(id) on delete cascade,
  name            text not null,
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
alter table public.monitors enable row level security;

-- @classe: configuracao
-- ⚠️ Fronteira sutil: query_versions é histórico do que o OPERADOR pediu, não do
-- que o mundo respondeu. O RESULTADO da consulta, que a Fase 2 vai guardar, é
-- `conhecimento` e leva as 7 colunas de procedência. Confundir os dois é o erro
-- fácil aqui.
create table public.query_versions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  monitor_id      uuid not null references public.monitors(id) on delete cascade,
  version         integer not null,
  expression      text not null,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  unique (monitor_id, version)
);
alter table public.query_versions enable row level security;

create policy "membro lê monitor da própria organização" on public.monitors
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "analista ou mais escreve monitor" on public.monitors
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','analyst']))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']));

create policy "membro lê versão de consulta da própria organização" on public.query_versions
  for select to authenticated
  using (public.is_org_member(organization_id));

-- ⚠️ Só INSERT, de propósito: não há policy de UPDATE nem de DELETE.
-- Versão é histórico, e histórico que pode ser reescrito não é histórico.
create policy "analista ou mais cria versão de consulta" on public.query_versions
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']));

create index on public.monitors (organization_id, project_id);
create index on public.query_versions (monitor_id, version desc);
