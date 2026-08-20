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

_Vazio — preenchido quando houver o primeiro segredo._

Cada linha registra: qual credencial, onde vive, e **se dá para ler de volta**.

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

_Vazio — nascem na Fase 1._

---

## 12. As rotas de API

_Vazio._

---

## 13. As tabelas do banco

_Vazio — as primeiras nascem na Fase 1 (organizations, memberships) e Fase 2 (source,
connector, content)._

Cada tabela registra: nome, área de `lib/` que manda nela, e se tem `organization_id` + RLS.
