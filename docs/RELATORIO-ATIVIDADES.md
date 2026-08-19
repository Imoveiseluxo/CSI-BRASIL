# Relatório de Atividades — CSI Brasil

Log de tudo que foi feito no projeto, sessão por sessão. **Mais recente no topo.**

Regra: toda mudança entra aqui, e o relatório é atualizado **durante** a sessão, não só no
fim. Vale desde o primeiro commit.

---

## 19/08/2026, 18h45 — Book v2: chegou uma camada de produto inteira

O dono entregou o `CSI_Brasil_Book_v2_Completo_Claude.pdf` (versão 2.0, 19/08/2026) e pediu
para atualizar o projeto **antes de fazer qualquer coisa**.

**Método:** em vez de reler 40 páginas de olho, extraí os dois PDFs com
`pdftotext -layout -enc UTF-8` e **comparei**. O v1 continua preservado em
`docs/spec/BOOK-CSI-BRASIL-v1.md`, porque as decisões tomadas às 01h04 foram tomadas sobre
aquele texto — apagá-lo tornaria impossível saber sobre o que o dono decidiu.

**O que mudou, medido:**

| | v1 | v2 |
|---|---|---|
| Seções | 22 | **25** |
| Motores da arquitetura | **8** | **10** |
| Linhas de texto | 1.544 | 1.909 |

Os dois motores novos são **Investigation / Transform** e **Evidence & Cases Engine**.

**Contagem de termos, que mostra que não é reorganização de texto:**

| Termo | v1 | v2 |
|---|---|---|
| Playbook | 0 | **24** |
| Data Lineage | 0 | **9** |
| Transform Registry | 0 | **7** |
| Investigation Engine | 0 | **7** |
| Graph Workspace | 0 | **4** |
| Connector SDK | 0 | **3** |
| Evidence Vault | 3 | **9** |

**A origem da mudança:** o v2 assume o **Maltego** como referência funcional e traduz oito
capacidades dele em componentes do CSI — Canonical Entity Model, Transform Registry,
Investigation Playbooks, Graph Workspace, Data Hub + Connector SDK, Recursive Pivot Search,
Provenance Graph e Graph Collections.

**⚠️ O achado que muda trabalho, não só documentação.** O v2 escreve como regra de projeto:
*"o grafo não é decoração. Cada nó e cada aresta devem ser rastreáveis a evidência, fonte,
Transform, usuário/agente responsável, data e nível de confiança."* Isso **não é feature da
Fase 7** — é coluna obrigatória em toda tabela que guarde nó ou aresta, **desde a primeira**.
**O plano da Fase 1 foi escrito sobre o v1 e não tem isso.** Executá-lo como está faria o
modelo de dados nascer sem linhagem, e corrigir depois custaria a base inteira. Registrado
como risco 14 nas pendências.

**⚠️ E um conflito com uma decisão já tomada.** Em 01h04 o dono decidiu "plataforma que eu
opero, vendendo acesso" — e foi **essa** decisão que abriu a porta jurídica para usar o
`elite-programa` como referência, porque a licença da Awave permite faturar com o **serviço**,
não com o software. **O v2 acrescentou opção de `on-premise` / Enterprise deployment.** Se o
CSI Brasil também for instalado no cliente, ele vira software entregue e a porta fecha de
novo. Virou a pendência **2**, e não é detalhe de fase 10: muda o que pode ser usado como
referência **agora**.

**O que foi atualizado:** `docs/spec/BOOK-CSI-BRASIL.md` (v2, com o v1 preservado ao lado),
`docs/ROADMAP.md` (Fase 7 renomeada e reescopada, bloco novo do Investigation Engine),
`CLAUDE.md`, `docs/MAPA-DO-SISTEMA.md` (a regra de rastreabilidade na seção de travas) e
`docs/PENDENCIAS.md` (pendência 2 e risco 14).

📎 Consertado de passagem: a tabela "Esperando decisão sua" estava sem linha de cabeçalho e
não renderizava como tabela.

**Nenhum código foi escrito** — o pedido era atualizar as informações antes de qualquer
coisa, e as três decisões que destravam a Fase 1 continuam abertas.

---

## 19/08/2026, 01h10 — as duas decisões que destravaram a Fase 1

**O dono decidiu, e as duas respostas mudam o modelo de dados:**

1. **O CSI Brasil é uma plataforma que ele opera**, vendendo acesso — não é software
   entregue ao cliente. Consequência dura: **multi-tenancy desde a primeira tabela**.
2. **O domínio é inteligência corporativa brasileira** — CNPJ, PNCP e CVM prioritários. O
   protótipo de geopolítica entra só como desenho de tela.

Uma consequência lateral que vale registrar: como o produto é **serviço operado**, a licença
do `elite-programa` deixa de ser impeditiva — ela permite faturar com o serviço. A
recomendação técnica não muda (base extraída do Bahia Realty, `elite-programa` só como
referência de desenho), mas a porta jurídica que estava fechada agora está aberta.

**Escrito em seguida:** `docs/superpowers/plans/2026-08-19-fase-1-core-multi-tenant.md` — 5
tarefas com SQL e TypeScript prontos:

1. **A trava primeiro**, antes de qualquer tabela: um teste que lê as migrations e reprova
   tabela sem `organization_id`, sem RLS, ou com `FORCE ROW LEVEL SECURITY`. Regra que nasce
   depois da primeira violação já nasceu tarde.
2. Organizações, membros e os helpers `is_org_member` / `has_org_role` — com os dois
   ingredientes que evitam recursão infinita (`security definer` **e** `row_security = off`).
3. A matriz de papéis em lógica pura, testável sem banco, com **negar como padrão**.
4. Projetos — a primeira tabela de domínio, que serve de molde para todas as outras.
5. Monitores e versões de consulta, com **histórico imutável** de propósito: versão que pode
   ser reescrita não é histórico, e mudança de resultado seria atribuída ao mundo quando foi
   ao operador.

⚠️ Cada tarefa que aplica migration tem passo de **conferir no banco**, não de presumir. E o
passo do monitor avisa explicitamente que UPDATE que casa zero linhas **não devolve erro** —
é preciso contar as linhas afetadas.

---

## 19/08/2026, 01h — a fundação documental, antes de existir código

**Pedido do dono:** replicar para o CSI Brasil os documentos de método do Bahia Realty e
estruturar o plano de implantação.

**Decisão de partida: adaptar, não copiar.** O `CLAUDE.md` do Bahia Realty registra o que
sobrou da última vez que um molde foi copiado naquele projeto — arquivo de configuração
apontando para o banco errado, documento de deploy inteiro de outro projeto, pacote com nome
de template e bot com o nome de outra empresa. Copiar os documentos ao pé da letra repetiria
exatamente o erro que eles descrevem. Cada arquivo foi reescrito para este projeto.

**O que entrou**

| Arquivo | O que é |
|---|---|
| `CLAUDE.md` | Método de trabalho, convenções, regras absolutas e a **regra de interpretação do book** — segurança, integridade da evidência, legalidade e auditabilidade prevalecem sobre velocidade |
| `docs/REGRAS-DE-EXECUCAO.md` | **Como se trabalha aqui, em qualquer tarefa** — a regra zero, o método, as cinco regras antitropeços com os erros reais que as motivaram, qual rotina usar para cada pedido, os anti-padrões proibidos e quando escalar |
| `docs/MAPA-DO-SISTEMA.md` | Índice de processos, com as seções criadas e **honestamente marcadas como vazias**. O ciclo de vida do conteúdo, em 8 etapas, já está escrito |
| `docs/ROADMAP.md` | As 11 fases da seção 22 do book, o recorte do MVP vendável, e a contradição interna do book sobre a pilha de dados — registrada, não escondida |
| `docs/PENDENCIAS.md` | As 5 decisões que travam o projeto, mais 4 riscos conhecidos herdados da experiência do Bahia Realty |
| `docs/spec/BOOK-CSI-BRASIL.md` | O texto do book extraído do PDF, para a especificação viajar junto do código e ser pesquisável |
| `docs/superpowers/plans/2026-08-19-fase-0-fundacao-governada.md` | O plano da Fase 0, em 4 tarefas com passos executáveis |

**O que o plano da Fase 0 cobre:** esqueleto do projeto com portão de qualidade, o
teste-vigia que impede área de `lib/` existir fora do mapa, o portão no CI, e o threat model
com o que cada ameaça exige do código.

**Uma escolha que merece explicação: o teste-vigia nasce antes do código.** No Bahia Realty a
regra "mapa atualizado na mesma tarefa" existia em três lugares e os três eram texto — e
texto não trava nada: quando o teste foi finalmente escrito, o mapa declarava 11 rotinas
havendo 12 e 42 rotas havendo 43. Aqui a trava é armada antes do primeiro desvio possível.

⚠️ **Onde o plano para, e por quê.** As tarefas de multi-tenancy, workspace, RBAC e primeiro
conector **não foram escritas**, porque dependem de duas decisões que ainda não existem: se o
CSI Brasil é produto para vender, plataforma operada ou ferramenta interna; e se o domínio é
inteligência corporativa brasileira ou geopolítica internacional. Escrever essas tarefas
agora seria inventar requisito — e tabela criada antes da primeira resposta tem chance de
nascer errada. Itens 1 e 2 das pendências.

**Antecedente desta sessão:** auditoria comparativa de quatro repositórios candidatos a base
(`awave-agents`, `geopolitics-live-stream`, `elite-programa`, `bahia-realty`), com as duas
travas que decidem a escolha — a licença proprietária da Awave e a ausência de multi-tenancy
no `elite-programa`. A recomendação registrada é extrair o encanamento do Bahia Realty,
arquivo por arquivo, e usar o `elite-programa` apenas como referência de desenho da camada de
orquestração. Item 5 das pendências.
