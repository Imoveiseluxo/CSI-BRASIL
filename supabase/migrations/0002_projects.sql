-- Projeto: o contexto de trabalho dentro de uma organização.
-- Esta é a PRIMEIRA tabela de domínio, e serve de molde para todas as outras.
--
-- ⚠️ NÃO APLICADA ainda (19/08/2026) — ver docs/PENDENCIAS.md, item 19.

-- @classe: configuracao
-- Projeto é o que o operador organizou, não o que o sistema descobriu no mundo —
-- por isso NÃO leva colunas de procedência. Ver docs/CONTRATO-DE-PROCEDENCIA.md.
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.projects enable row level security;

create policy "membro lê projeto da própria organização" on public.projects
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "analista ou mais escreve projeto" on public.projects
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','analyst']))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']));

create index on public.projects (organization_id, created_at desc);
