-- A busca precisa ignorar acento. Medido em 20/08/2026, contra o banco:
--
--   to_tsvector('portuguese','SÃO PAULO') @@ websearch_to_tsquery('portuguese','sao paulo')
--     -> FALSE
--   to_tsvector('portuguese','GOIANIA')  @@ websearch_to_tsquery('portuguese','goiânia')
--     -> FALSE
--
-- ⚠️ Num produto de inteligência corporativa BRASILEIRA isso não é detalhe:
-- "São Paulo", "Goiânia", "Brasília" e "Camaçari" são a norma, e cada fonte
-- escreve de um jeito. Busca que erra por acento é busca que não serve.

create extension if not exists unaccent;

-- ⚠️ `unaccent()` é STABLE, e coluna gerada exige IMMUTABLE. Este invólucro fixa
-- o dicionário explicitamente, que é o que torna o resultado determinístico e
-- permite marcá-lo como imutável.
--
-- ⚠️ A consequência de fixar: se alguém trocar o dicionário `unaccent` do banco,
-- as colunas geradas NÃO serão recalculadas sozinhas e passarão a discordar do
-- que a função devolve. Isso é raro e vale ficar escrito.
create or replace function public.sem_acento(t text)
returns text
language sql
immutable
strict
parallel safe
set search_path = public, extensions
as $$ select unaccent('unaccent', t) $$;

-- Recriar as colunas de busca usando o invólucro.
alter table public.companies drop column busca;
alter table public.companies
  add column busca tsvector
  generated always as (
    to_tsvector(
      'portuguese',
      public.sem_acento(
        coalesce(razao_social, '') || ' ' ||
        coalesce(nome_fantasia, '') || ' ' ||
        coalesce(cnpj, '') || ' ' ||
        coalesce(municipio, '') || ' ' ||
        coalesce(uf, '') || ' ' ||
        coalesce(cnae_principal, '')
      )
    )
  ) stored;
create index companies_busca_idx on public.companies using gin (busca);

alter table public.evidence drop column busca;
alter table public.evidence
  add column busca tsvector
  generated always as (
    to_tsvector(
      'portuguese',
      public.sem_acento(coalesce(content::text, '') || ' ' || coalesce(request_key, ''))
    )
  ) stored;
create index evidence_busca_idx on public.evidence using gin (busca);

-- ⚠️ O TERMO da busca também precisa vir sem acento — quem tira é o código, em
-- `lib/busca/queries.ts`. Tirar só de um lado deixaria a busca meio consertada,
-- que é pior que não consertada: funcionaria nos testes de quem digita sem
-- acento e falharia para quem digita certo.
