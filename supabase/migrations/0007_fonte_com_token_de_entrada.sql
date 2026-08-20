-- Entrada de conteúdo por webhook (decisão do dono, 19/08/2026): o e-mail é
-- encaminhado para um endereço nosso e um serviço entrega o conteúdo numa rota
-- nossa. **Nenhuma senha de caixa de e-mail é guardada** — é a razão inteira da
-- escolha.
--
-- Para isso a rota precisa saber DE QUEM é o conteúdo que chegou. Quem responde
-- isso é a fonte: cada fonte que recebe por webhook ganha um token próprio.

-- ⚠️ Guardamos o HASH do token, nunca o token. Mesma razão de senha: quem
-- ganhar acesso de leitura ao banco não pode sair usando as entradas de
-- terceiros. O token em texto só existe uma vez, na hora de criar.
alter table public.sources add column webhook_token_hash text;

-- ⚠️ Unicidade GLOBAL, não por organização. Se dois tenants pudessem ter o
-- mesmo hash, a rota teria que escolher um deles — e escolheria errado metade
-- das vezes, entregando conteúdo de um cliente para outro.
create unique index sources_webhook_token_hash_key
  on public.sources (webhook_token_hash)
  where webhook_token_hash is not null;

comment on column public.sources.webhook_token_hash is
  'sha256 do token de entrada. O token em texto nunca é guardado — só o hash.';
