-- Filtros na busca: período e fonte.
--
-- ⚠️ **Troca a assinatura da função**, por isso o `drop` antes. Adicionar
-- parâmetros com valor padrão criaria uma SEGUNDA função com o mesmo nome, e o
-- PostgREST não saberia qual chamar — erro de ambiguidade em tempo de
-- execução, que aparece só quando alguém busca. Não há perda de dado: função
-- não guarda nada, e as tabelas não são tocadas.
drop function if exists public.buscar(uuid, text);

-- ⚠️ Continua `security invoker`, e NUNCA pode virar `definer`. Ela lê tabelas
-- protegidas por RLS; como `definer` devolveria resultado de QUALQUER
-- organização. Busca é onde um vazamento passa despercebido, porque o
-- resultado parece legítimo.
create or replace function public.buscar(
  p_org    uuid,
  p_termo  text,
  p_desde  timestamptz default null,
  p_fonte  uuid        default null
)
returns table (
  tipo        text,
  id          uuid,
  titulo      text,
  detalhe     text,
  trecho      text,
  fonte       text,
  coletado_em timestamptz,
  confianca   numeric,
  relevancia  real
)
language sql
stable
security invoker
set search_path = public
as $$
  with consulta as (
    select websearch_to_tsquery('portuguese', public.sem_acento(p_termo)) as q
  )
  select
    'empresa'::text,
    c.id,
    c.razao_social,
    concat_ws(' · ',
      nullif(c.nome_fantasia, ''), c.cnpj,
      nullif(concat_ws('/', c.municipio, c.uf), ''), c.situacao
    ),
    ts_headline(
      'portuguese',
      public.sem_acento(concat_ws(' ', c.razao_social, c.nome_fantasia, c.municipio, c.uf)),
      consulta.q,
      E'StartSel=\x02,StopSel=\x03,MaxWords=18,MinWords=5,HighlightAll=FALSE'
    ),
    s.name,
    e.collected_at,
    c.confidence,
    ts_rank(c.busca, consulta.q)
  from public.companies c
  cross join consulta
  left join public.sources  s on s.id = c.source_id
  left join public.evidence e on e.id = c.evidence_id
  where c.organization_id = p_org
    and c.busca @@ consulta.q
    -- `coalesce` com `produced_at` como rede.
    --
    -- ⚠️ **Hoje ele nunca é acionado, e isso foi medido, não suposto:**
    -- `companies.evidence_id` é `NOT NULL` (tentei inserir uma empresa sem
    -- evidência em 20/08/2026 e o banco recusou, erro 23502). Ou seja, toda
    -- empresa tem evidência, e `collected_at` sempre existe.
    --
    -- Fica assim mesmo porque o dia em que essa obrigatoriedade for afrouxada,
    -- o filtro de período faria a empresa **sumir da tela sem erro nenhum** —
    -- a busca passaria a mentir por omissão, que é a falha mais cara deste
    -- projeto: some, ninguém vê, e a tela continua parecendo certa.
    and (p_desde is null or coalesce(e.collected_at, c.produced_at) >= p_desde)
    and (p_fonte is null or c.source_id = p_fonte)

  union all

  select
    'evidencia'::text,
    v.id,
    coalesce(v.request_key, '(sem chave)'),
    'artefato bruto guardado'::text,
    -- ⚠️ Evidência NÃO tem trecho destacado, de propósito: o artefato cru pode
    -- conter dado pessoal, e um trecho numa lista de busca vazaria isso sem
    -- ninguém ter escolhido abrir nada.
    null::text,
    s.name,
    v.collected_at,
    null::numeric,
    ts_rank(v.busca, consulta.q)
  from public.evidence v
  cross join consulta
  left join public.sources s on s.id = v.source_id
  where v.organization_id = p_org
    and v.busca @@ consulta.q
    and (p_desde is null or v.collected_at >= p_desde)
    and (p_fonte is null or v.source_id = p_fonte)

  order by 9 desc, 7 desc
  limit 40;
$$;

revoke execute on function public.buscar(uuid, text, timestamptz, uuid) from public, anon;
grant  execute on function public.buscar(uuid, text, timestamptz, uuid) to authenticated;
