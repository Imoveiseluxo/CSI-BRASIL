-- A PRIMEIRA tabela de conhecimento do CSI Brasil.
--
-- Tudo aqui foi derivado de uma evidência guardada — nada foi digitado por
-- alguém nem inventado pelo sistema. Por isso ela carrega as 7 colunas de
-- procedência do `docs/CONTRATO-DE-PROCEDENCIA.md`, e é a primeira vez que esse
-- contrato deixa de ser teoria.

-- `evidence` precisa ser referenciável por (id, organization_id) para a chave
-- composta lá embaixo funcionar. A migration 0005 deu essa unicidade a
-- `projects`, `monitors` e `sources`, mas não a `evidence` — que ainda não
-- tinha filho. Agora tem.
alter table public.evidence add constraint evidence_id_org_key unique (id, organization_id);

-- @classe: conhecimento
create table public.companies (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,

  -- Identidade (bloco "Identidade" da ficha de empresa do book)
  cnpj             text not null,
  razao_social     text not null,
  nome_fantasia    text,
  situacao         text,
  data_abertura    date,
  cnae_principal   text,
  municipio        text,
  uf               text,
  capital_social   numeric,

  -- ---------------------------------------------------------------------
  -- PROCEDÊNCIA — as 7 colunas do contrato.
  -- ---------------------------------------------------------------------
  -- De qual fonte veio.
  source_id        uuid not null,
  -- Qual artefato guardado sustenta isto. `not null` de propósito: empresa
  -- sem evidência não é conhecimento, é palpite.
  evidence_id      uuid not null,
  -- Qual operação produziu. `null` = coleta direta, sem transformação.
  transform_id     uuid,
  -- Humano, agente ou rotina? A diferença entre alguém ter afirmado e um
  -- modelo ter inferido é o que dá ou tira valor da evidência.
  produced_by_kind text not null check (produced_by_kind in ('humano', 'agente', 'rotina')),
  produced_by      uuid references auth.users(id),
  produced_at      timestamptz not null default now(),
  -- ⚠️ SEM `default` e SEM `not null`, e a trava reprova quem acrescentar.
  -- Valor padrão inventado vira número na tela que ninguém mediu. Ou o
  -- produtor sabe a confiança e escreve, ou fica nulo e a tela mostra
  -- "não informado".
  confidence       numeric(3, 2) check (confidence >= 0 and confidence <= 1),

  updated_at       timestamptz not null default now(),

  -- Uma empresa por CNPJ dentro de cada organização.
  unique (organization_id, cnpj),

  -- ⚠️ Chaves compostas com o tenant, pela mesma razão da migration 0005:
  -- sem isto, uma empresa da Org A poderia apontar para evidência da Org B —
  -- procedência corrompida, e o banco aceitaria calado.
  constraint companies_source_mesma_org
    foreign key (source_id, organization_id)
    references public.sources (id, organization_id),
  constraint companies_evidence_mesma_org
    foreign key (evidence_id, organization_id)
    references public.evidence (id, organization_id)
);
alter table public.companies enable row level security;

create policy "membro lê empresa da própria organização" on public.companies
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "analista ou mais escreve empresa" on public.companies
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','analyst']))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']));

create index on public.companies (organization_id, razao_social);
create index on public.companies (organization_id, uf, municipio);
create index on public.companies (evidence_id);
