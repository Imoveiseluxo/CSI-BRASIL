-- O modelo da rede: entidades, identificadores e ligações.
--
-- ⚠️ **A rede NÃO é feita de empresas.** É feita de identificadores e ligações —
-- e é isso que faz a mesma tela servir para CNPJ, e-mail e perfil de rede
-- social sem reescrever nada. Fonte nova só acrescenta identificador e ligação;
-- a busca, a expansão e a exportação continuam as mesmas.
--
-- Decisão do dono em 20/08/2026: a mesma estrutura de busca e ramificação vale
-- para perfil de redes sociais e para e-mail, e todo resultado precisa poder
-- ser expandido para extração.

-- ---------------------------------------------------------------------------
-- Entidade: o nó.
-- ---------------------------------------------------------------------------
-- @classe: conhecimento
create table if not exists public.entities (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  kind             text not null check (kind in ('empresa', 'pessoa', 'perfil')),
  display_name     text not null,
  -- Procedência, igual ao resto do sistema. Sem exceção.
  source_id        uuid references public.sources (id),
  evidence_id      uuid references public.evidence (id),
  -- Qual transformação produziu isto. Nulo enquanto o Transform Registry do
  -- Book v2 não existir — mas a coluna nasce junto, senão a rastreabilidade
  -- teria de ser retrofitada em cima de dado já gravado.
  transform_id     uuid,
  produced_by_kind text not null,
  produced_by      uuid,
  produced_at      timestamptz not null default now(),
  -- ⚠️ Sem `default` e sem `not null`: confiança não medida fica NULA, nunca
  -- vira um número inventado. Contrato de procedência.
  confidence       numeric,
  unique (id, organization_id)
);

comment on table public.entities is '@classe:conhecimento — nó da rede de ligações.';

-- ---------------------------------------------------------------------------
-- Identificador: como uma entidade é reconhecida no mundo.
--
-- ⚠️ É aqui que e-mail e rede social entram sem mudar nada: são só mais dois
-- valores de `kind`.
-- ---------------------------------------------------------------------------
-- @classe: conhecimento
create table if not exists public.identifiers (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  entity_id        uuid not null,
  kind             text not null check (kind in (
    'cnpj', 'cnpj_basico', 'cpf_mascarado', 'email', 'dominio',
    'telefone', 'perfil_social', 'site', 'endereco'
  )),
  -- Valor já normalizado (minúsculo, sem pontuação) — é por ele que se casa.
  value            text not null,
  -- Como veio na origem, para o humano conferir.
  value_original   text,
  source_id        uuid references public.sources (id),
  evidence_id      uuid references public.evidence (id),
  transform_id     uuid,
  produced_by_kind text not null,
  produced_by      uuid,
  produced_at      timestamptz not null default now(),
  confidence       numeric,
  -- ⚠️ Chave composta com a organização: é estrutura que impede o vínculo
  -- cruzado entre clientes, não política que alguém pode esquecer de aplicar.
  foreign key (entity_id, organization_id)
    references public.entities (id, organization_id) on delete cascade,
  unique (organization_id, entity_id, kind, value)
);

comment on table public.identifiers is '@classe:conhecimento — como a entidade é reconhecida.';

create index if not exists identifiers_valor_idx
  on public.identifiers (organization_id, kind, value);

-- ---------------------------------------------------------------------------
-- Ligação: a aresta.
--
-- ⚠️ **Toda ligação nasce apontando para uma evidência.** Aresta sem evidência
-- não entra — é a mesma regra que já vale para empresa, onde `evidence_id` é
-- obrigatório no banco.
-- ---------------------------------------------------------------------------
-- @classe: conhecimento
create table if not exists public.links (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  from_entity_id   uuid not null,
  to_entity_id     uuid not null,
  kind             text not null,
  -- O que sustenta a ligação, em português, para aparecer na tela e na planilha.
  rationale        text,
  source_id        uuid references public.sources (id),
  evidence_id      uuid not null references public.evidence (id),
  transform_id     uuid,
  produced_by_kind text not null,
  produced_by      uuid,
  produced_at      timestamptz not null default now(),
  -- ⚠️ NULA quando não há critério medido. E quando há, o número vem com o
  -- porquê em `rationale` — o book exige score explicável, e score sem a conta
  -- ao lado é exatamente o que ele proíbe.
  confidence       numeric,
  -- ⚠️ **A etiqueta que impede a rede de mentir.** Ligação por sócio casa nome
  -- + CPF MASCARADO (a Receita só publica seis dígitos do meio), então ela é
  -- provável, não provada: homônimos com os mesmos seis dígitos existem. Num
  -- produto de inteligência, ligação errada é pior que ligação ausente — quem
  -- recebe uma rede acredita nela.
  certeza          text not null default 'provavel'
    check (certeza in ('confirmada', 'provavel', 'possivel')),
  foreign key (from_entity_id, organization_id)
    references public.entities (id, organization_id) on delete cascade,
  foreign key (to_entity_id, organization_id)
    references public.entities (id, organization_id) on delete cascade,
  foreign key (evidence_id, organization_id)
    references public.evidence (id, organization_id),
  unique (organization_id, from_entity_id, to_entity_id, kind)
);

comment on table public.links is '@classe:conhecimento — aresta da rede, sempre com evidência.';

create index if not exists links_saida_idx on public.links (organization_id, from_entity_id);
create index if not exists links_entrada_idx on public.links (organization_id, to_entity_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.entities enable row level security;
alter table public.identifiers enable row level security;
alter table public.links enable row level security;

drop policy if exists entities_membro on public.entities;
drop policy if exists identifiers_membro on public.identifiers;
drop policy if exists links_membro on public.links;

create policy entities_membro on public.entities
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy identifiers_membro on public.identifiers
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy links_membro on public.links
  for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
