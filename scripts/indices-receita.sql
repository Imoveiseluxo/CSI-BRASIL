-- Recria os índices da camada de referência DEPOIS que a carga termina.
--
-- Uso: aplicar este arquivo quando `scripts/carrega-tudo.sh` tiver terminado.
--
-- ⚠️ **Rodar isto no MEIO da carga desfaz o ganho inteiro.** A razão de os
-- índices não nascerem junto com a tabela está na migration 0016, e foi medida:
-- com índices, a mesma carga de 2 milhões de linhas passou de 147 segundos para
-- mais de 18 minutos, com o banco preso em espera de disco.
--
-- ⚠️ **Sem estes índices a rede funciona, mas varre a tabela inteira.** Ou
-- seja: o sistema não quebra, ele fica lento — e lentidão sem explicação é o
-- tipo de coisa que alguém "resolve" mexendo no lugar errado. Se a rede estiver
-- demorando, a primeira pergunta é se estes índices existem.
--
-- ⚠️ **RODE UM ÍNDICE POR VEZ.** Os três de uma vez falharam em 20/08/2026 com
-- `No space left on device`: construir índice exige espaço temporário de
-- ordenação, e três ordenações de 28 milhões de linhas ao mesmo tempo não cabem
-- no disco do plano atual. Um a um, cada um levou entre 71 e 113 segundos e
-- passou sem apertar o disco.
--
--   PGPASS=... node scripts/roda-sql.js <arquivo com UM create index>
--
-- Este arquivo tem os três juntos de propósito, como REFERÊNCIA do que precisa
-- existir. Rodá-lo inteiro num banco cheio vai falhar, e o aviso acima é o que
-- impede alguém de perder uma hora descobrindo por quê.

-- O caminho de ida: os sócios de uma empresa.
create index if not exists rf_socios_cnpj_idx
  on public.rf_socios (cnpj_basico);

-- O caminho de volta: em que mais este documento aparece.
create index if not exists rf_socios_documento_idx
  on public.rf_socios (documento_socio)
  where documento_socio is not null and documento_socio <> '';

-- ⚠️ Nome + documento juntos, porque o documento vem MASCARADO pela Receita e
-- não identifica ninguém sozinho. É este par que sustenta a ligação — e ainda
-- assim ela é PROVÁVEL, nunca provada.
create index if not exists rf_socios_nome_documento_idx
  on public.rf_socios (nome_socio, documento_socio);

-- Confere que os três existem. Se este SELECT devolver menos de 3, algum
-- comando acima falhou em silêncio.
select count(*)::text || ' de 3 índices no lugar' as resultado
  from pg_indexes
 where schemaname = 'public'
   and indexname in (
     'rf_socios_cnpj_idx',
     'rf_socios_documento_idx',
     'rf_socios_nome_documento_idx'
   );
