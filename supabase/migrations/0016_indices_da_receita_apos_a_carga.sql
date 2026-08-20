-- Os índices da camada de referência passam a ser criados DEPOIS da carga.
--
-- ⚠️ **Isto veio de medição, não de teoria.** Em 20/08/2026, carregando
-- `rf_socios`:
--
--   primeira parte (2 milhões de linhas, tabela vazia)  ->  147 segundos
--   parte seguinte (2 milhões, tabela com 2 milhões)    ->  mais de 18 minutos
--
-- O `pg_stat_activity` mostrou o `COPY` em `wait_event_type = IO`: não era
-- rede, não era processador — era **disco**. Com três índices na tabela, cada
-- linha inserida obriga o banco a escrever em três árvores B em posições
-- aleatórias. Isso é escrita aleatória, que é o padrão mais caro que existe.
--
-- Construir o índice **uma vez, no fim**, é uma varredura sequencial e uma
-- ordenação — muito mais barato que manter a árvore equilibrada 26 milhões de
-- vezes.
--
-- ⚠️ **A consequência assumida:** enquanto os índices não existirem, a rede
-- funciona mas fica LENTA — a consulta varre a tabela inteira. Isso é um
-- estado intermediário legítimo, e é melhor que o contrário (carga que nunca
-- termina). Quem carregar precisa recriar os índices no fim, e é por isso que
-- a instrução está no script, não só na cabeça de alguém.

drop index if exists public.rf_socios_cnpj_idx;
drop index if exists public.rf_socios_documento_idx;
drop index if exists public.rf_socios_nome_documento_idx;

-- Os comandos de recriação vivem em `scripts/indices-receita.sql`, para serem
-- rodados quando a carga terminar. Não ficam aqui porque, se ficassem, aplicar
-- a migration recriaria os índices no meio da carga e o problema voltaria.
