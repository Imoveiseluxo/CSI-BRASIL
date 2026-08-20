# Mapa do sistema — onde fica cada processo

> **Para que serve:** responder "onde está X?" sem varrer o projeto inteiro.
>
> **Regra de manutenção:** processo novo entra aqui **na mesma tarefa** em que é criado. Mapa
> desatualizado é pior que mapa nenhum — dá confiança falsa.
>
> **Esta regra vai ganhar rede:** a Fase 0 prevê `tests/mapa-em-dia.test.ts`, que conta do
> código e compara com o que este arquivo declara (conectores, rotinas, rotas, telas, tabelas).
> Enquanto o teste não existir, a regra é só texto — e texto não trava nada.
>
> ⚠️ **O teste não sabe se a DESCRIÇÃO está certa.** Ele garante que nada existe sem estar
> aqui; não garante que o que está escrito ainda é verdade. Processo que mudou de
> comportamento continua sendo responsabilidade de quem mexeu.

**Estado deste mapa em 19/08/2026:** o projeto ainda não tem código. As seções abaixo estão
criadas com a estrutura que vão ter e marcadas como vazias. **Seção vazia é honesta; seção
com conteúdo inventado, não.**

---

## Índice

1. [O ciclo de vida de um conteúdo](#1-o-ciclo-de-vida-de-um-conteúdo) — de onde nasce até virar evidência
2. [As fontes e seus conectores](#2-as-fontes-e-seus-conectores)
3. [As travas que protegem a evidência](#3-as-travas-que-protegem-a-evidência)
4. [As rotinas automáticas](#4-as-rotinas-automáticas)
5. [Onde ficam as credenciais](#5-onde-ficam-as-credenciais)
6. [Regras de banco que mordem](#6-regras-de-banco-que-mordem)
7. [Onde mexer quando…](#7-onde-mexer-quando)
8. [Os agentes, e o que cada um pode](#8-os-agentes-e-o-que-cada-um-pode)
9. [Inventário de `lib/`](#9-inventário-de-lib)
10. [As guardas de acesso](#10-as-guardas-de-acesso)
11. [As telas](#11-as-telas)
12. [As rotas de API](#12-as-rotas-de-api)
13. [As tabelas do banco](#13-as-tabelas-do-banco)

---

## 1. O ciclo de vida de um conteúdo

É o caminho que mais importa neste sistema. Um conteúdo precisa atravessar todas as etapas
abaixo **na ordem**, e cada etapa só pode afirmar o que a anterior sustenta.

| # | Etapa | O que grava | Existe? |
|---|---|---|---|
| 1 | **Descoberta** — o conector encontra o conteúdo | `content` bruto, endereço de origem, data de publicação, data de coleta | ⬜ Fase 2 |
| 2 | **Normalização** — texto limpo, idioma, canonical URL | `content` normalizado | ⬜ Fase 2 |
| 3 | **Deduplicação** — o mesmo conteúdo por duas fontes vira um | chave de deduplicação | ⬜ Fase 2 |
| 4 | **Extração** — campos estruturados e entidades citadas | `mention` | ⬜ Fase 3 |
| 5 | **Resolução de entidade** — a citação vira entidade real | `entity` + proveniência | ⬜ Fase 3 |
| 6 | **Evento** — conteúdos relacionados viram um acontecimento | `event` | ⬜ Fase 5 |
| 7 | **Score** — risco e oportunidade, com a conta à vista | score + explicação | ⬜ Fase 5 |
| 8 | **Alerta** — o que merece interromper um humano | notificação + motivo | ⬜ Fase 5 |

⚠️ **A regra que não pode ser quebrada:** nenhuma etapa pode exibir afirmação que a etapa 1
não sustente. Se a origem não foi guardada, o resto é opinião.

---

## 2. As fontes e seus conectores

_Vazio — primeiro conector chega na Fase 2._

Quando houver conteúdo, cada linha registra: fonte, tipo de coleta, base legal/termo de uso
conferido, frequência, e o arquivo do conector.

---

## 3. As travas que protegem a evidência

| Trava | O que garante | O que ela **NÃO** cobre |
|---|---|---|
| `tests/toda-tabela-e-multi-tenant.test.ts` | Nenhuma tabela entra sem `organization_id`, sem RLS, ou com `FORCE ROW LEVEL SECURITY` | **O estado do banco.** Ela lê SQL do repositório; migration escrita não é migration aplicada |
| `tests/rastreabilidade-do-conhecimento.test.ts` | Toda tabela **declara a classe**, e tabela de `conhecimento` carrega as 7 colunas de procedência, com `confidence` sem `default` nem `not null` | **Que alguém escreva** nessas colunas. Garante que existam, não que sejam preenchidas |

Contrato completo em `docs/CONTRATO-DE-PROCEDENCIA.md`.

⚠️ **A segunda trava age sobre a DECLARAÇÃO, não sobre o nome da tabela.** Um
teste que tentasse deduzir a classe pelo nome erraria nos dois sentidos e daria
falsa segurança — pior que não ter trava. E ela lê SQL por expressão regular:
não entende SQL. **Quem prova que ela funciona é o passo de quebrar de propósito
— quatro casos, todos vistos vermelhos em 19/08/2026.**

⚠️ **Quem preenche cada coluna de procedência entra AQUI junto com o conector**,
na mesma tarefa. No projeto anterior, três campos existiam, nenhuma linha de
código escrevia neles, e painéis e alertas ficaram pendurados em zero por
semanas.

⚠️ **Regra que o Book v2 (19/08/2026) escreve em caixa alta, e que vale desde a primeira
tabela:** *"o grafo não é decoração. Cada nó e cada aresta devem ser rastreáveis a
evidência, fonte, Transform, usuário/agente responsável, data e nível de confiança."*

Isso **não** é feature da Fase 7. É coluna obrigatória em qualquer tabela que guarde nó,
aresta, entidade ou fato extraído. Nascer sem isso significa reescrever o modelo depois —
e o projeto anterior do mesmo dono já mostrou o custo de descobrir tarde que **ninguém
escreve num campo** de que painéis e alertas dependiam.

⚠️ Esta seção existe desde o primeiro dia por um motivo: no projeto anterior do mesmo dono,
uma trava foi instalada em **um** canal e os outros três ficaram sem — e ninguém tinha como
perceber. **Trava nova entra aqui com a lista de todos os caminhos que ela cobre e os que
não cobre.**

---

## 4. As rotinas automáticas

_Vazio — a primeira rotina de coleta chega na Fase 2._

Cada linha registra: horário, nome, o que faz, e **o que ela mede para saber que funcionou**
(resultado, não status).

---

## 5. Onde ficam as credenciais

| Credencial | Onde vive | Da para ler de volta? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | variavel de ambiente na Vercel, nos 3 ambientes | sim — e nao e segredo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem | sim — publica por desenho, protegida pela RLS |
| `DIAGNOSTICO_SECRET` | variavel de ambiente na Vercel, nos 3 ambientes | **nao** pelo painel. Substituir e gerar outra |
| Senha do banco Postgres | **arquivo unico** na maquina do dono | **nao.** O Supabase nao mostra de novo — so permite redefinir |

⚠️ **A senha do banco tem UMA copia.** Perde-se e so resta redefinir. Ela nao e
usada pelo app — o app usa a URL e a chave anon; a senha e para conexao direta
(psql, ferramenta de migration, cliente de banco).

⚠️ **`DIAGNOSTICO_SECRET` ausente FECHA a rota (503), nao abre.** Ha teste
travando esse comportamento — sem ele, um ambiente novo sem a variavel nasceria
com endpoint publico que consulta em nosso nome.

---

## 6. Regras de banco que mordem

| Regra | Consequência de ignorar |
|---|---|
| Policies permissivas combinam com **OU** | acrescentar policy restritiva ao lado de uma ampla **não restringe nada**. Tem que derrubar e recriar |
| Tabela com policy de INSERT não tem, por isso, policy de UPDATE | o UPDATE casa zero linhas e o banco **não devolve erro** — parece que deu certo |
| Escrita em massa sem `.select()` de volta | sem contar as linhas alteradas, você reporta sucesso pelo *status*, não pelo *resultado* |
| Consulta com centenas de ids na URL | estoura o limite do PostgREST e **falha em silêncio** |
| Dado público sai por função `security definer` com `search_path` fixado | view com essa propriedade é apontada pelo verificador de segurança, e não fixa `search_path` |
| Toda data no fuso de Brasília | entre 21h e meia-noite o "hoje" em UTC já é outro dia |

---

## 7. Onde mexer quando…

| Sintoma | Comece por |
|---|---|
| Conteúdo não entrou | seção 1 — descubra em qual das 8 etapas ele parou |
| A mesma notícia aparece duas vezes | etapa 3, deduplicação |
| Entidade errada vinculada | etapa 5 — resolução recusa quando é ambíguo; vincular errado é pior que deixar vazio |
| Score parece errado | a conta é aberta; leia a explicação junto do número antes de mexer no cálculo |
| Alerta que ninguém lê | consequência visível se corrige no servidor, não com aviso |

---

## 8. Os agentes, e o que cada um pode

_Vazio — a camada multiagente chega na Fase 8._

A seção 19 do book define 13 agentes (Supervisor, Research, Extraction, Verification, Company,
Government, Document, Graph, Risk, Opportunity, Report, Compliance, QA), cada um com
ferramentas mínimas e contrato de saída `AgentResult<T>` com `evidence_refs`, `confidence`,
`assumptions`, `policy_flags` e `trace_id`.

⚠️ **Regra estrutural do book:** agente não é persona genérica com acesso total. Cada um tem
objetivo, ferramentas mínimas, schema de entrada e saída, limite, orçamento, timeout e
política de repetição.

---

## 9. Inventário de `lib/`

| Área | O que faz | Origem |
|---|---|---|
| `lib/supabase/server.ts` | Cliente do **usuário logado** — respeita RLS. É este que vale em toda leitura de dado de domínio | extraído do Bahia Realty, 19/08/2026 |
| `lib/supabase/service.ts` | Cliente com papel de serviço — **ignora RLS**. Só rotina de servidor. Tem `import "server-only"`, que **quebra o build** se um componente de navegador importar | extraído, 19/08/2026 |
| `lib/logger.ts` | Log de erro sem vazar `details`/`hint` do provedor | extraído, 19/08/2026 |
| `lib/auth/permissions.ts` | A **matriz de papéis**, lógica pura, testável sem banco. Fonte única | adaptado, 19/08/2026 |
| `lib/auth/guards.ts` | `requireUser`, `requireOrgMember`, `requireOrgRole`, `requireSection` | adaptado, 19/08/2026 |
| `lib/orgs/queries.ts` | Vínculo da pessoa com a organização | adaptado, 19/08/2026 |

---

## 10. As guardas de acesso

| Guarda | Pergunta que ela faz |
|---|---|
| `requireUser` | "tem sessão?" |
| `requireOrgMember` | "pertence a esta organização?" — **o piso** |
| `requireOrgRole` | "tem um destes papéis?" — use só quando a regra for de papel |
| `requireSection` | "o papel dela libera ESTA seção?" — pela matriz central. **Prefira esta** |

⚠️ **As guardas são a SEGUNDA camada, não a primeira.** Quem impede um dado de
vazar é a RLS, no banco. As guardas decidem o que a pessoa vê na navegação. No
projeto anterior, a tela de leads é guardada só pelo piso — porque quem separa um
corretor do outro é a RLS —, e quem lesse só a guarda concluiria que a tela estava
aberta.

⚠️ **O que NÃO foi extraído, de propósito:** o Bahia Realty tem
`requireMfaSatisfied`, que força o segundo fator antes de entrar. Ele não veio
porque redireciona para uma tela `/mfa` que aqui não existe — e guarda que aponta
para página inexistente é pior que guarda nenhuma. **Fica registrado como
pendência**, não como esquecimento.

---

## 11. As telas

| Tela | Guarda | O que mostra |
|---|---|---|
| `/entrar` | nenhuma (e' o login). Quem ja tem sessao e' mandado ao workspace | e-mail e senha |
| `/sem-organizacao` | sessao | quem tem login mas nenhum vinculo. **Nao oferece criar organizacao** — quem libera acesso e' o operador |
| `/app/[orgSlug]` | `requireOrgMember` | busca, consulta de CNPJ, e a lista de empresas **com a procedencia ao lado do dado** |
| `/app/[orgSlug]/evidencia/[id]` | `requireOrgMember` + RLS | a fonte, o hash completo, o que foi derivado, e o **artefato cru** |

⚠️ **A procedencia nao fica em aba escondida.** O book proibe "dado na tela sem
origem rastreavel", e ficha bonita com a origem escondida seria exatamente isso.
O hash na ficha e' link para a evidencia: quem duvida clica e ve o original.

⚠️ **Evidencia de outra organizacao responde 404, nao "sem permissao"** — dizer
"existe mas nao e' sua" confirmaria a existencia do id. Provado em 20/08/2026
com uma segunda organizacao de teste, apagada em seguida.

---

## 12. As rotas de API

| Rota | Como se defende | O que faz |
|---|---|---|
| `POST /api/entrada/email` | **Token da fonte** no cabecalho. Guardamos so o hash. Token inexistente e fonte desligada recebem a MESMA resposta — dizer "existe mas esta inativa" confirmaria o token para quem adivinha | Recebe e-mail encaminhado por um servico externo e grava o corpo **cru** como evidencia com hash. Nao interpreta alem do minimo para achar depois |
| `GET /api/diagnostico/cnpj` | **Segredo** `DIAGNOSTICO_SECRET` no cabecalho. **Sem o segredo configurado responde 503** — fechada, nao aberta | Consulta um CNPJ pelos provedores e devolve o resultado normalizado, o provedor que atendeu, o tempo e **quem falhou antes**. Nao grava nada |

⚠️ **Por que ela existe:** a maquina de desenvolvimento nao alcanca os
provedores. Sem medir do lugar onde o codigo roda, a unica afirmacao possivel
seria "esta testado na logica" — que nao e o mesmo que "funciona".

⚠️ **Rota de diagnostico nao grava.** Diagnostico que escreve no banco vira dado
de teste em producao.

---

## 13. As tabelas do banco

✅ **APLICADAS em 19/08/2026, 21h50** no projeto `CSI Brasil`
(`mmgucspxrfxdcztkrklb`, região `sa-east-1`), com `pgvector` 0.8.2.

**Conferido no banco, não presumido:** RLS `ligada=true` e **`forcada=false`** nas
cinco; helpers `is_org_member` e `has_org_role` com `security definer` **e**
`row_security=off`; `query_versions` sem policy de UPDATE nem DELETE.

⚠️ **E a RLS foi provada cortando**, que é diferente de existir: com duas
organizações e dois usuários, cada sessão simulada dentro do banco enxergou
**só o próprio projeto**. O cenário de teste foi apagado em seguida.

| Tabela | Classe | Área | Quem escreve nela |
|---|---|---|---|
| `organizations` | `configuracao` | `lib/orgs/` | criação de workspace (ainda não existe) |
| `memberships` | `configuracao` | `lib/orgs/` | convite e gestão de membros (ainda não existe) |
| `projects` | `configuracao` | `lib/projects/` | o operador, pela tela de projetos (ainda não existe) |
| `monitors` | `configuracao` | `lib/monitors/` | o operador (ainda não existe) |
| `query_versions` | `configuracao` | `lib/monitors/` | o operador, **só INSERT** — histórico não se reescreve |
| `sources` | `configuracao` | `lib/sources/` | o operador, ao ligar uma fonte (tela ainda não existe) |
| `evidence` | **`evidencia`** | `lib/sources/` | **a rotina de coleta** e a **rota `/api/entrada/email`**, ambas com `collected_by_kind='rotina'` — **só INSERT** |
| `companies` | **`conhecimento`** | `lib/companies/` | **a ingestão** (`lib/companies/ingest.ts`, Tarefa 5 — ainda não existe). Preenche as 7 colunas de procedência a partir da evidência |

⚠️ **Todas as chaves estrangeiras entre tabelas de domínio são COMPOSTAS com o
tenant** (`(id, organization_id)`), desde 19/08/2026. Sem isso, uma linha da
Org A conseguia apontar para uma linha da Org B — medido e confirmado antes de
consertar. Chave composta é estrutura: o banco recusa mesmo em rotina com papel
de serviço, que ignora RLS. **Tabela nova com referência a outra tabela de
domínio nasce com chave composta**, não com `references x(id)`.

⚠️ **A coluna "quem escreve nela" não é enfeite, e hoje ela está toda em "ainda
não existe" de propósito.** No projeto anterior, três campos de atendimento
existiam, nenhuma linha de código escrevia neles, e painéis, alertas e e-mails
automáticos ficaram pendurados em número que nunca saiu de zero — por semanas.
**Tabela cuja coluna alimenta número na tela precisa ter aqui quem a preenche.**

⚠️ **Nenhuma delas é `conhecimento`** — todas registram o que o operador pediu.
A primeira tabela de conhecimento nasce na Fase 2 (o documento coletado) e leva
as 7 colunas de procedência. Ver `docs/CONTRATO-DE-PROCEDENCIA.md`.

Cada tabela registra: nome, área de `lib/` que manda nela, e se tem `organization_id` + RLS.
