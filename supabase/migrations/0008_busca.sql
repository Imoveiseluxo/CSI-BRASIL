-- Busca textual sobre o que já foi coletado.
--
-- Decisão do dono (19/08/2026): PostgreSQL + pgvector, sem OpenSearch. Aqui
-- usamos a busca textual nativa do Postgres, que é suficiente para o volume de
-- hoje e não acrescenta peça nenhuma para operar.
--
-- ⚠️ **Coluna gerada, não gatilho.** Coluna gerada é mantida pelo próprio banco
-- e não pode sair de sincronia; gatilho depende de alguém lembrar de criá-lo em
-- toda tabela nova, e de ele não falhar em silêncio.

-- ---------------------------------------------------------------------------
-- Empresas
-- ---------------------------------------------------------------------------
alter table public.companies
  add column busca tsvector
  generated always as (
    to_tsvector(
      'portuguese',
      coalesce(razao_social, '') || ' ' ||
      coalesce(nome_fantasia, '') || ' ' ||
      coalesce(cnpj, '') || ' ' ||
      coalesce(municipio, '') || ' ' ||
      coalesce(uf, '') || ' ' ||
      coalesce(cnae_principal, '')
    )
  ) stored;

create index companies_busca_idx on public.companies using gin (busca);

-- ---------------------------------------------------------------------------
-- Evidências
-- ---------------------------------------------------------------------------
-- ⚠️ Busca sobre o artefato CRU, de propósito. É o que permite achar um e-mail
-- pelo que estava escrito nele antes de existir qualquer interpretação — e o
-- dono definiu e-mail como fonte de busca justamente assim.
--
-- ⚠️ Limite conhecido e assumido: indexar JSON inteiro traz também nomes de
-- campo e valores técnicos, então a busca em evidência é mais ruidosa que a de
-- empresa. É preferível a alternativa — depender de uma interpretação que ainda
-- não existe para poder achar qualquer coisa.
alter table public.evidence
  add column busca tsvector
  generated always as (
    to_tsvector('portuguese', coalesce(content::text, '') || ' ' || coalesce(request_key, ''))
  ) stored;

create index evidence_busca_idx on public.evidence using gin (busca);
