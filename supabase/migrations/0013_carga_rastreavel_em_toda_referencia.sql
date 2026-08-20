-- Procedência em TODA tabela da camada de referência, e trava contra carga
-- repetida.
--
-- Duas correções descobertas ao rodar a primeira carga de verdade, em
-- 20/08/2026 — nenhuma das duas apareceu em teste, só na execução:
--
-- 1. **As tabelas de código não tinham `carga_id`.** A carga morreu com
--    `column "carga_id" does not exist`. Elas são pequenas, mas procedência não
--    é proporcional ao tamanho: sem `carga_id` elas seriam o único dado do
--    sistema sem origem rastreável.
--
-- 2. ⚠️ **Carga repetida duplicaria tudo em silêncio.** `rf_socios` tem chave
--    sequencial; rodar o mesmo arquivo duas vezes inseriria as linhas de novo,
--    sem erro, e a rede sairia com **arestas dobradas**. Numa rede de ligações
--    isso não é "dado a mais" — é conclusão errada, porque peso de vínculo e
--    contagem de sócios passam a mentir. O índice único abaixo transforma esse
--    acidente silencioso em erro na cara de quem rodar.

alter table public.rf_qualificacoes add column if not exists carga_id uuid references public.rf_carga (id);
alter table public.rf_naturezas     add column if not exists carga_id uuid references public.rf_carga (id);
alter table public.rf_paises        add column if not exists carga_id uuid references public.rf_carga (id);
alter table public.rf_municipios    add column if not exists carga_id uuid references public.rf_carga (id);
alter table public.rf_cnaes         add column if not exists carga_id uuid references public.rf_carga (id);
alter table public.rf_motivos       add column if not exists carga_id uuid references public.rf_carga (id);

-- ⚠️ **A trava contra carga repetida.** Um arquivo, de um mês, carregado com
-- sucesso, só pode existir uma vez. `concluida_em is not null` no filtro é o
-- ponto: carga que falhou no meio **pode** ser refeita, e é isso que se quer —
-- o que não pode é uma segunda carga bem-sucedida do mesmo arquivo.
create unique index if not exists rf_carga_unica_por_arquivo
  on public.rf_carga (arquivo, mes_base)
  where concluida_em is not null;

-- Índices do caminho de volta: é isto que responde "quais outras empresas este
-- sócio tem". Sem eles a consulta varre a tabela inteira.
create index if not exists rf_socios_cnpj_idx on public.rf_socios (cnpj_basico);
create index if not exists rf_socios_documento_idx on public.rf_socios (documento_socio)
  where documento_socio is not null and documento_socio <> '';
-- ⚠️ Nome + documento juntos: o documento vem mascarado pela Receita e não
-- identifica ninguém sozinho. É este par que sustenta a ligação — e ainda assim
-- ela é PROVÁVEL, nunca provada.
create index if not exists rf_socios_nome_documento_idx
  on public.rf_socios (nome_socio, documento_socio);
