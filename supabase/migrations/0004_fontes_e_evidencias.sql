-- Fontes e evidências — a base do caminho de dado (Fase 2).
--
-- `sources` diz DE ONDE o dado pode vir; `evidence` guarda O QUE a fonte
-- devolveu, cru. A entidade derivada disso vem na migration seguinte.

-- @classe: configuracao
-- Catálogo de fontes. É configuração: registra o que o operador ligou, não o
-- que o mundo respondeu.
create table public.sources (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  kind            text not null check (kind in ('api', 'arquivo', 'feed', 'manual')),
  endpoint        text,
  -- ⚠️ `is_active` decide se a rotina consulta. Não é enfeite: fonte que
  -- respondia e parou precisa ser desligada sem ser apagada, senão a evidência
  -- já coletada perde a referência.
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  unique (organization_id, name)
);
alter table public.sources enable row level security;

create policy "membro lê fonte da própria organização" on public.sources
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "analista ou mais gerencia fonte" on public.sources
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','analyst']))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']));

-- @classe: evidencia
-- O artefato capturado, do jeito que a fonte devolveu. Não interpreta nada.
--
-- ⚠️ `content_hash` é o que separa evidência de cópia: é ele que permite
-- afirmar que o guardado é o mesmo que a fonte respondeu. O Evidence Vault da
-- Fase 7 depende inteiramente disso.
create table public.evidence (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  source_id         uuid not null references public.sources(id),
  -- A resposta crua. jsonb porque a primeira fonte é API; artefato binário
  -- (PDF, imagem) ganha armazenamento próprio quando existir.
  content           jsonb not null,
  content_hash      text not null,
  -- O que foi consultado para obter isto — o CNPJ, a URL, o termo.
  request_key       text,
  collected_at      timestamptz not null default now(),
  collected_by_kind text not null check (collected_by_kind in ('humano', 'agente', 'rotina')),
  collected_by      uuid references auth.users(id)
);
alter table public.evidence enable row level security;

create policy "membro lê evidência da própria organização" on public.evidence
  for select to authenticated
  using (public.is_org_member(organization_id));

-- ⚠️ SÓ INSERT, de propósito. Não há policy de UPDATE nem de DELETE:
-- evidência que pode ser reescrita não é evidência. Mesma regra de
-- `query_versions`, e a trava `rastreabilidade-do-conhecimento` reprova quem
-- tentar acrescentar uma.
create policy "analista ou mais registra evidência" on public.evidence
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']));

create index on public.evidence (organization_id, collected_at desc);
create index on public.evidence (source_id, request_key);
-- Achar rápido "já coletei este artefato?" sem varrer o conteúdo.
create index on public.evidence (content_hash);
