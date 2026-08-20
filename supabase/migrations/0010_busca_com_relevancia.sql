-- Busca com relevância e trecho destacado.
--
-- Antes, os resultados vinham na ordem que o banco quis e sem contexto: com uma
-- empresa só isso não incomoda, com quinhentas a busca deixa de servir.
--
-- ⚠️ **`security invoker`, e NUNCA `security definer`.** Esta função lê tabelas
-- protegidas por RLS. Marcada como `definer`, ela rodaria com os poderes de quem
-- a criou e devolveria resultado de QUALQUER organização — e busca é justamente
-- onde um vazamento passa despercebido, porque o resultado parece legítimo.
-- `invoker` é o padrão do Postgres; está escrito aqui de propósito, para que
-- ninguém "otimize" isso depois.
create or replace function public.buscar(p_org uuid, p_termo text)
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
    -- O trecho que casou, com a palavra marcada. Sobre os campos da própria
    -- empresa: nunca sobre o artefato bruto, que pode conter dado pessoal.
    --
    -- ⚠️ Marca com \x02 e \x03 (caracteres de controle), **não** com `<b>`. O
    -- padrão do `ts_headline` é HTML, e exibir HTML vindo de fonte externa
    -- exigiria `dangerouslySetInnerHTML` no React — que é abrir XSS por
    -- conveniência de formatação. Com caracteres de controle, o texto continua
    -- texto: a tela quebra em pedaços e o React escapa cada um.
    --
    -- ⚠️ São caracteres de controle, e não «» ou [[]], porque o delimitador não
    -- pode existir dentro de uma razão social — senão a marcação sai torta.
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
  where c.organization_id = p_org and c.busca @@ consulta.q

  union all

  select
    'evidencia'::text,
    v.id,
    coalesce(v.request_key, '(sem chave)'),
    'artefato bruto guardado'::text,
    -- ⚠️ Evidência NÃO tem trecho destacado, de propósito. O artefato cru pode
    -- conter dado pessoal, e um trecho numa lista de busca é exatamente o lugar
    -- onde isso vazaria sem ninguém ter escolhido abrir nada.
    null::text,
    s.name,
    v.collected_at,
    null::numeric,
    ts_rank(v.busca, consulta.q)
  from public.evidence v
  cross join consulta
  left join public.sources s on s.id = v.source_id
  where v.organization_id = p_org and v.busca @@ consulta.q

  order by 9 desc, 7 desc
  limit 40;
$$;

revoke execute on function public.buscar(uuid, text) from public, anon;
grant  execute on function public.buscar(uuid, text) to authenticated;
