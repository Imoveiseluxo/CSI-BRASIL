-- Fecha um vazamento entre organizações encontrado em 19/08/2026 por revisão de
-- segurança e CONFIRMADO por teste contra o banco.
--
-- O QUE ESTAVA ERRADO: as chaves estrangeiras apontavam só para `id`. A RLS
-- confere o `organization_id` DA PRÓPRIA LINHA, mas nunca verificava se a linha
-- REFERENCIADA é da mesma organização. Medido:
--
--   usuário só da Org A gravou evidência da Org A apontando fonte da Org B -> PASSOU
--   usuário só da Org A criou monitor da Org A apontando projeto da Org B   -> PASSOU
--
-- Consequências: procedência corrompida (a evidência declara uma fonte que não
-- é sua), e confirmação da existência de ids alheios pelo comportamento da FK.
--
-- POR QUE A CORREÇÃO É CHAVE COMPOSTA, E NÃO POLICY: policy é regra que alguém
-- precisa lembrar de escrever em cada tabela nova. Chave composta é estrutura —
-- o banco recusa, mesmo que a consulta esqueça, mesmo em rotina com papel de
-- serviço, que ignora RLS. É a mesma lição do projeto anterior: a trava que
-- vale é a que não depende de disciplina.

-- ---------------------------------------------------------------------------
-- 1. As tabelas-pai precisam de uma unicidade que inclua o tenant, para poderem
--    ser alvo de chave composta. `id` já é único, então isto não muda nada do
--    ponto de vista de dados — só habilita a referência.
-- ---------------------------------------------------------------------------
alter table public.projects  add constraint projects_id_org_key  unique (id, organization_id);
alter table public.monitors  add constraint monitors_id_org_key  unique (id, organization_id);
alter table public.sources   add constraint sources_id_org_key   unique (id, organization_id);

-- ---------------------------------------------------------------------------
-- 2. Trocar cada chave simples pela composta.
-- ---------------------------------------------------------------------------
alter table public.monitors drop constraint monitors_project_id_fkey;
alter table public.monitors
  add constraint monitors_project_mesma_org
  foreign key (project_id, organization_id)
  references public.projects (id, organization_id) on delete cascade;

alter table public.query_versions drop constraint query_versions_monitor_id_fkey;
alter table public.query_versions
  add constraint query_versions_monitor_mesma_org
  foreign key (monitor_id, organization_id)
  references public.monitors (id, organization_id) on delete cascade;

alter table public.evidence drop constraint evidence_source_id_fkey;
alter table public.evidence
  add constraint evidence_source_mesma_org
  foreign key (source_id, organization_id)
  references public.sources (id, organization_id);
