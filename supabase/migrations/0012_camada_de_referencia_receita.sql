-- Camada de referência: a base pública de CNPJ da Receita Federal.
--
-- ⚠️ **Estas tabelas NÃO têm `organization_id`, e isso é uma exceção deliberada
-- à regra absoluta do projeto.** A base é pública e idêntica para todos os
-- clientes; duplicar dezenas de GB por organização não traria isolamento
-- nenhum, só custo.
--
-- A regra passa a ler: *toda tabela de DADOS DE CLIENTE tem `organization_id` +
-- RLS, sem exceção. Tabelas da camada de referência não têm — e se identificam
-- pelo prefixo `rf_`.*
--
-- ⚠️ **O que impede a exceção de virar buraco:** o teste
-- `toda-tabela-e-multi-tenant.test.ts` passa a exigir que QUALQUER tabela sem
-- `organization_id` comece com `rf_`. A exceção fica sob teste, não sob
-- confiança de quem lembrar dela.
--
-- ⚠️ **Tabela `rf_` nunca recebe dado de cliente.** Escrita só pela rotina de
-- carga; para o aplicativo, é somente-leitura.

-- ---------------------------------------------------------------------------
-- A procedência da própria camada.
--
-- ⚠️ Sem isto, a camada de referência seria a única parte do sistema com dado
-- sem origem rastreável — dentro de um produto cuja premissa inteira é o
-- contrário. Qual arquivo, de qual endereço, de qual mês, quando, quantas
-- linhas e com que impressão digital.
-- ---------------------------------------------------------------------------
-- @classe: referencia
create table if not exists public.rf_carga (
  id             uuid primary key default gen_random_uuid(),
  arquivo        text        not null,           -- 'Socios9.zip'
  tabela_destino text        not null,           -- 'rf_socios'
  mes_base       text        not null,           -- '2026-07-12', a pasta publicada
  origem_url     text        not null,           -- endereço EXATO de onde baixamos
  -- ⚠️ 'espelho' quando não veio do servidor da Receita. Dizer "veio da
  -- Receita" quando veio de terceiro é afirmação sem lastro.
  origem_tipo    text        not null check (origem_tipo in ('receita', 'espelho')),
  content_hash   text        not null,           -- sha256 do arquivo baixado
  linhas         bigint,                         -- quantas linhas entraram de fato
  iniciada_em    timestamptz not null default now(),
  concluida_em   timestamptz,
  -- ⚠️ Carga que morreu no meio fica com `concluida_em` nulo e o erro aqui.
  -- Carga pela metade que se parece com carga completa é o pior resultado
  -- possível: a rede fica com buraco e ninguém vê.
  erro           text
);

comment on table public.rf_carga is
  '@classe:evidencia — procedência de cada carga da base pública da Receita.';

create index if not exists rf_carga_mes_idx on public.rf_carga (mes_base, tabela_destino);

-- ---------------------------------------------------------------------------
-- Empresas: o nó. Uma linha por raiz de CNPJ (os 8 primeiros dígitos).
-- Layout conferido no arquivo real de 2026-07-12.
-- ---------------------------------------------------------------------------
-- @classe: referencia
create table if not exists public.rf_empresas (
  cnpj_basico               char(8) primary key,
  razao_social              text,
  natureza_juridica         text,
  qualificacao_responsavel  text,
  capital_social            numeric,
  porte                     text,
  ente_federativo           text,
  carga_id                  uuid references public.rf_carga (id)
);

comment on table public.rf_empresas is
  '@classe:evidencia — base pública da Receita Federal, camada de referência.';

-- ---------------------------------------------------------------------------
-- Sócios: as arestas.
--
-- ⚠️ **`documento_socio` vem MASCARADO pela Receita** (`***567468**`, só seis
-- dígitos do meio do CPF). Conferido no arquivo real. Ele NÃO identifica uma
-- pessoa sozinho — por isso o caminho de volta ("outras empresas deste sócio")
-- casa por **nome + documento juntos**, e ainda assim a ligação é PROVÁVEL, não
-- provada: homônimos com os mesmos seis dígitos existem.
--
-- ⚠️ **O documento mascarado não vai para a tela nem para a planilha.** Serve
-- para ligar registros aqui dentro, e só — minimização, seção 20 do book.
-- ---------------------------------------------------------------------------
-- @classe: referencia
create table if not exists public.rf_socios (
  id                          bigserial primary key,
  cnpj_basico                 char(8) not null,
  -- '1' = pessoa jurídica, '2' = pessoa física, '3' = estrangeiro
  identificador_socio         char(1),
  nome_socio                  text,
  documento_socio             text,
  qualificacao_socio          text,
  data_entrada                date,
  pais                        text,
  representante_documento     text,
  nome_representante          text,
  qualificacao_representante  text,
  faixa_etaria                text,
  carga_id                    uuid references public.rf_carga (id)
);

comment on table public.rf_socios is
  '@classe:evidencia — quadro societário público. Documento vem mascarado na origem.';

-- ---------------------------------------------------------------------------
-- Tabelas de domínio da Receita (código -> descrição). Minúsculas e baratas.
-- Sem elas a rede mostra "49" onde deveria mostrar "Sócio-Administrador".
-- ---------------------------------------------------------------------------
-- @classe: referencia
create table if not exists public.rf_qualificacoes (
  codigo text primary key,
  descricao text not null
);
-- @classe: referencia
create table if not exists public.rf_naturezas (
  codigo text primary key,
  descricao text not null
);
-- @classe: referencia
create table if not exists public.rf_paises (
  codigo text primary key,
  descricao text not null
);
-- @classe: referencia
create table if not exists public.rf_municipios (
  codigo text primary key,
  descricao text not null
);
-- @classe: referencia
create table if not exists public.rf_cnaes (
  codigo text primary key,
  descricao text not null
);
-- @classe: referencia
create table if not exists public.rf_motivos (
  codigo text primary key,
  descricao text not null
);

-- ---------------------------------------------------------------------------
-- RLS: ligada em tudo, com UMA política — leitura para quem tem sessão.
--
-- ⚠️ Parece contraditório ligar RLS numa tabela sem `organization_id`, mas não
-- é: sem RLS, a tabela ficaria aberta ao papel `anon` — qualquer um com a chave
-- pública do projeto baixaria a base inteira pela API. A política diz o que
-- queremos de verdade: **lê quem está autenticado, e ninguém escreve.**
--
-- Sem `force` — como em todas as tabelas deste projeto. A proibição já existe
-- desde a `0001` (FORCE + helper `security definer` dá recursão infinita), e
-- aqui ela ainda cai bem por um segundo motivo: `force` sujeitaria o DONO da
-- tabela à RLS, e é o dono que a rotina de carga usa para escrever.
--
-- ⚠️ **Não existe política de escrita nenhuma, e é isso que segura a exceção.**
-- `authenticated` e `anon` não escrevem por definição, não por confiança.
-- ---------------------------------------------------------------------------
-- ⚠️ **Escrito tabela por tabela de propósito, e não num laço.** A primeira
-- versão usava `do $$ ... execute format(...)`, que é mais curto — e a guarda
-- `toda-tabela-e-multi-tenant.test.ts` reprovou, porque ela lê o TEXTO das
-- migrations e um laço esconde dela os comandos de segurança. A guarda estava
-- certa: código esperto que cega a própria rede de proteção é o problema, não
-- o teste. Verboso e visível ganha de curto e opaco quando o assunto é acesso.

alter table public.rf_carga          enable row level security;
alter table public.rf_empresas       enable row level security;
alter table public.rf_socios         enable row level security;
alter table public.rf_qualificacoes  enable row level security;
alter table public.rf_naturezas      enable row level security;
alter table public.rf_paises         enable row level security;
alter table public.rf_municipios     enable row level security;
alter table public.rf_cnaes          enable row level security;
alter table public.rf_motivos        enable row level security;

drop policy if exists rf_carga_leitura         on public.rf_carga;
drop policy if exists rf_empresas_leitura      on public.rf_empresas;
drop policy if exists rf_socios_leitura        on public.rf_socios;
drop policy if exists rf_qualificacoes_leitura on public.rf_qualificacoes;
drop policy if exists rf_naturezas_leitura     on public.rf_naturezas;
drop policy if exists rf_paises_leitura        on public.rf_paises;
drop policy if exists rf_municipios_leitura    on public.rf_municipios;
drop policy if exists rf_cnaes_leitura         on public.rf_cnaes;
drop policy if exists rf_motivos_leitura       on public.rf_motivos;

create policy rf_carga_leitura         on public.rf_carga         for select to authenticated using (true);
create policy rf_empresas_leitura      on public.rf_empresas      for select to authenticated using (true);
create policy rf_socios_leitura        on public.rf_socios        for select to authenticated using (true);
create policy rf_qualificacoes_leitura on public.rf_qualificacoes for select to authenticated using (true);
create policy rf_naturezas_leitura     on public.rf_naturezas     for select to authenticated using (true);
create policy rf_paises_leitura        on public.rf_paises        for select to authenticated using (true);
create policy rf_municipios_leitura    on public.rf_municipios    for select to authenticated using (true);
create policy rf_cnaes_leitura         on public.rf_cnaes         for select to authenticated using (true);
create policy rf_motivos_leitura       on public.rf_motivos       for select to authenticated using (true);

-- Cinto e suspensório: mesmo sem política de escrita, tirar o direito na marra.
revoke insert, update, delete, truncate on public.rf_carga         from authenticated, anon;
revoke insert, update, delete, truncate on public.rf_empresas      from authenticated, anon;
revoke insert, update, delete, truncate on public.rf_socios        from authenticated, anon;
revoke insert, update, delete, truncate on public.rf_qualificacoes from authenticated, anon;
revoke insert, update, delete, truncate on public.rf_naturezas     from authenticated, anon;
revoke insert, update, delete, truncate on public.rf_paises        from authenticated, anon;
revoke insert, update, delete, truncate on public.rf_municipios    from authenticated, anon;
revoke insert, update, delete, truncate on public.rf_cnaes         from authenticated, anon;
revoke insert, update, delete, truncate on public.rf_motivos       from authenticated, anon;

revoke all on public.rf_carga         from anon;
revoke all on public.rf_empresas      from anon;
revoke all on public.rf_socios        from anon;
revoke all on public.rf_qualificacoes from anon;
revoke all on public.rf_naturezas     from anon;
revoke all on public.rf_paises        from anon;
revoke all on public.rf_municipios    from anon;
revoke all on public.rf_cnaes         from anon;
revoke all on public.rf_motivos       from anon;
