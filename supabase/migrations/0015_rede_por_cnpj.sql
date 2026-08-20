-- O motor de ramificação: a partir de um CNPJ, quem se liga a quem.
--
-- ⚠️ **`security invoker`, e NUNCA `definer`.** Ela só lê a camada de
-- referência, que é pública — mas a regra vale igual: função que lê tabela com
-- RLS e roda como `definer` devolve o que quiser a quem quiser. Escrito aqui
-- para ninguém "otimizar" isso depois.
--
-- ⚠️ **A rede não afirma mais do que o dado sustenta.** Duas certezas
-- diferentes saem daqui, e a diferença é do próprio arquivo da Receita:
--
--   sócio pessoa JURÍDICA → o documento é o CNPJ inteiro, 14 dígitos, sem
--                           máscara → ligação CONFIRMADA
--   sócio pessoa FÍSICA   → o documento é CPF MASCARADO (`***567468**`, só seis
--                           dígitos do meio) → ligação PROVÁVEL, casada por
--                           nome + documento juntos
--
-- Homônimos com os mesmos seis dígitos existem. Num produto de inteligência,
-- ligação errada é pior que ligação ausente: quem recebe uma rede acredita
-- nela. Por isso a etiqueta viaja com a linha até a planilha.

create or replace function public.rede_por_cnpj(
  p_cnpj_basico char(8),
  p_saltos      int default 2,
  -- ⚠️ Teto explícito. Um sócio de holding pode estar em milhares de empresas,
  -- e sem teto a consulta engole o banco. Melhor devolver menos e dizer que
  -- cortou do que travar a tela.
  p_limite      int default 500
)
returns table (
  salto          int,
  origem_cnpj    char(8),
  origem_nome    text,
  vinculo        text,
  socio_nome     text,
  qualificacao   text,
  destino_cnpj   char(8),
  destino_nome   text,
  certeza        text,
  motivo         text
)
language sql
stable
security invoker
set search_path = public
as $$
  with recursive caminhada as (
    -- A semente: a empresa de onde a investigação parte.
    select
      p_cnpj_basico       as cnpj,
      0                   as salto,
      -- ⚠️ `text[]`, e não `char(8)[]`: o Postgres recusa a recursão quando o
      -- termo inicial declara `character(8)[]` e o termo recursivo produz
      -- `bpchar[]` (erro 42804). Tipos que "são o mesmo" para quem lê nem
      -- sempre são para o planejador.
      array[p_cnpj_basico::text] as visitados

    union all

    -- De cada empresa alcançada, vá para as empresas que compartilham sócio.
    select
      s2.cnpj_basico,
      c.salto + 1,
      c.visitados || s2.cnpj_basico::text
    from caminhada c
    join public.rf_socios s1 on s1.cnpj_basico = c.cnpj
    join public.rf_socios s2
      on s2.nome_socio = s1.nome_socio
     and s2.documento_socio = s1.documento_socio
     and s2.cnpj_basico <> c.cnpj
    where c.salto < p_saltos
      -- ⚠️ Sem isto a consulta entra em laço: A tem sócio em B, B tem o mesmo
      -- sócio em A, e a recursão nunca termina.
      and not (s2.cnpj_basico::text = any (c.visitados))
      -- ⚠️ Documento vazio casaria TODOS com TODOS. É o jeito mais fácil de a
      -- rede inventar milhares de ligações que não existem.
      and coalesce(s1.documento_socio, '') <> ''
      and coalesce(s1.nome_socio, '') <> ''
  ),
  alcancadas as (
    select distinct on (cnpj) cnpj, salto
    from caminhada
    order by cnpj, salto
  )
  select
    a.salto,
    a.cnpj,
    eo.razao_social,
    'socio_em_comum'::text,
    s.nome_socio,
    coalesce(q.descricao, s.qualificacao_socio),
    s2.cnpj_basico,
    ed.razao_social,
    -- A etiqueta, decidida pelo tipo do documento — não por palpite.
    case when s.identificador_socio = '1' then 'confirmada' else 'provavel' end,
    case
      when s.identificador_socio = '1'
        then format('%s é sócia das duas, pelo CNPJ %s', s.nome_socio, s.documento_socio)
      else format(
        '%s aparece como sócia das duas. Casado por nome e CPF parcial (%s) — a Receita não publica o CPF inteiro, então homônimo é possível.',
        s.nome_socio, s.documento_socio
      )
    end
  from alcancadas a
  join public.rf_socios s  on s.cnpj_basico = a.cnpj
  join public.rf_socios s2 on s2.nome_socio = s.nome_socio
                          and s2.documento_socio = s.documento_socio
                          and s2.cnpj_basico <> a.cnpj
  left join public.rf_empresas eo on eo.cnpj_basico = a.cnpj
  left join public.rf_empresas ed on ed.cnpj_basico = s2.cnpj_basico
  left join public.rf_qualificacoes q on q.codigo = s.qualificacao_socio
  where coalesce(s.documento_socio, '') <> ''
    -- ⚠️ A empresa de partida não é "empresa ligada" a si mesma. Sem isto ela
    -- aparece na própria lista de ligações — porque a caminhada alcança o
    -- vizinho e o vizinho aponta de volta. Medido em 20/08/2026: a rede de uma
    -- empresa com um único vínculo mostrava duas linhas, sendo uma ela mesma.
    and s2.cnpj_basico <> p_cnpj_basico
  order by a.salto, s.nome_socio
  limit p_limite;
$$;

revoke execute on function public.rede_por_cnpj(char, int, int) from public, anon;
grant  execute on function public.rede_por_cnpj(char, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Os sócios de uma empresa, direto. É o primeiro clique de qualquer
-- investigação, e não precisa da recursão inteira para responder.
-- ---------------------------------------------------------------------------
create or replace function public.socios_da_empresa(p_cnpj_basico char(8))
returns table (
  nome           text,
  tipo           text,
  qualificacao   text,
  entrada        date,
  -- ⚠️ Quantas OUTRAS empresas esta pessoa tem. É o número que faz alguém
  -- querer expandir aquela linha.
  outras_empresas bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.nome_socio,
    case s.identificador_socio
      when '1' then 'pessoa jurídica'
      when '2' then 'pessoa física'
      when '3' then 'estrangeiro'
      else 'não informado'
    end,
    coalesce(q.descricao, s.qualificacao_socio),
    s.data_entrada,
    (
      select count(*)
      from public.rf_socios o
      where o.nome_socio = s.nome_socio
        and o.documento_socio = s.documento_socio
        and o.cnpj_basico <> s.cnpj_basico
        and coalesce(s.documento_socio, '') <> ''
    )
  from public.rf_socios s
  left join public.rf_qualificacoes q on q.codigo = s.qualificacao_socio
  where s.cnpj_basico = p_cnpj_basico
  order by s.nome_socio;
$$;

revoke execute on function public.socios_da_empresa(char) from public, anon;
grant  execute on function public.socios_da_empresa(char) to authenticated;
