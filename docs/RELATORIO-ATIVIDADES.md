# Relatório de Atividades — CSI Brasil

Log de tudo que foi feito no projeto, sessão por sessão. **Mais recente no topo.**

Regra: toda mudança entra aqui, e o relatório é atualizado **durante** a sessão, não só no
fim. Vale desde o primeiro commit.

---

## 19/08/2026, 21h05 — as duas travas da Fase 1, provadas antes de existir a primeira tabela

**Tarefas 1 e 1b do plano da Fase 1, concluídas.** São as únicas totalmente verificáveis sem
banco — e as duas precisam existir **antes** da primeira tabela, pelo mesmo argumento:
*regra que nasce depois da primeira violação já nasceu tarde.*

**O que entrou:**

| Arquivo | O que trava |
|---|---|
| `tests/toda-tabela-e-multi-tenant.test.ts` | Tabela sem `organization_id`, sem RLS, ou com `FORCE ROW LEVEL SECURITY` |
| `docs/CONTRATO-DE-PROCEDENCIA.md` | O contrato: duas classes declaradas, e as 7 colunas de procedência |
| `tests/rastreabilidade-do-conhecimento.test.ts` | Tabela sem classe declarada, classe inválida, `conhecimento` sem procedência, e `confidence` com `default`/`not null` |

**Uma decisão de implementação que vale registrar:** a primeira trava confere
`organization_id` **dentro do corpo da própria tabela**, não em qualquer lugar do arquivo.
Sem isso, numa migration que cria duas tabelas, a segunda passaria de carona na declaração da
primeira — e o teste ficaria verde sobre um buraco.

**As quatro provas, todas vistas vermelhas:**

| Migration errada de propósito | Falhou em |
|---|---|
| Tabela crua, sem nada | `organization_id`, RLS **e** classe — 3 testes |
| `-- @classe: qualquer` | "a classe declarada é uma das duas" |
| `-- @classe: conhecimento` sem as colunas | as **7** faltas, nomeadas uma a uma |
| `confidence numeric(3,2) not null default 1` | "confidence não nasce com default" |

⚠️ **O quarto caso é o que mais importa**, e por isso foi escrito à mão exatamente como
alguém escreveria sem pensar: `default 1` é o jeito mais natural, e produz precisamente o
campo que ninguém preencheu com um número que parece medido.

**Verificação:** `tsc --noEmit` 0 erros · **14 testes verdes** · `biome check` limpo ·
`next build` completo.

**O que ficou aberto, e por quê:** as Tarefas 2, 4 e 5 escrevem migrations, e cada uma tem
passo de **aplicar e conferir no banco** — *"conferir que a RLS realmente corta"*, com dois
usuários de organizações diferentes. **Não existe projeto Supabase ainda.** Escrever a SQL
sem aplicar criaria exatamente a dívida que no outro projeto deixou um alerta de segurança no
ar por dias: migration escrita, nunca aplicada, e o repositório mentindo sobre o banco.
**Parei aqui de propósito** — o próximo passo depende de criar o projeto Supabase.

---

## 19/08/2026, 20h57 — correção: o acesso a CPF existe, via CDL

**Corrijo uma afirmação minha de sete minutos atrás.** Escrevi que consulta de CPF *"ou é de
acesso restrito com credencial própria, ou é comércio irregular de dado pessoal"*, tratando o
primeiro caminho como se fosse exótico. **Não é.** O dono informou que existe **integração
com a CDL** — que é exatamente a via legítima e contratada.

**O que a correção muda:** a disponibilidade técnica. O caminho existe e é legítimo.

**O que a correção NÃO muda, e é o ponto:** ter credencial responde *"eu consigo
consultar?"*. A LGPD pergunta outra coisa: *"por que, com que finalidade, com que
minimização, por quanto tempo, e como o titular exerce direitos?"* — e o book exige
exatamente isso, **registrado por conector**, antes da primeira linha.

⚠️ **E aqui há um risco específico deste caso, que é o mais provável de morder na prática.**
Credencial de birô (CDL/SPC) é contratada **para uma finalidade** — tipicamente análise de
crédito e consulta cadastral, dentro de uma relação em que o consultado é parte. Usar essa
mesma credencial para alimentar um produto de inteligência corporativa é **finalidade
diferente da contratada**: é o que a LGPD chama de finalidade incompatível, e o que costuma
estar vedado no próprio contrato do birô. **A consequência prática não é só jurídica — é o
tipo de uso que faz a credencial ser revogada.**

**Próximo passo, e é de leitura, não de código:** ler a cláusula de finalidade / uso
permitido do contrato com a CDL e transcrever na pendência 18 o que ela autoriza. Isso decide
se CPF entra no roadmap, com qual finalidade declarada, ou se fica fora.

**O que não muda de qualquer forma:** a **ordem**. CNPJ continua sendo o primeiro conector,
pelo argumento técnico — chave canônica e procedência sem ambiguidade —, que independe de
haver ou não acesso a CPF.

⚠️ **A mensagem do dono chegou cortada** (*"temos integração com a CDL e"*). O que vem depois
do "e" pode mudar esta análise, e está pendente.

---

## 19/08/2026, 20h50 — CNPJ é a primeira fonte; CPF fica fora, e e-mail fica depois

**Decisão do dono:** CNPJ primeiro. Pediu que ficasse registrado **por que não pode ser CPF
nem e-mail**.

**A resposta tem duas naturezas, e é importante não misturar: CPF é impedimento JURÍDICO;
e-mail é impedimento TÉCNICO de ordem.**

### Por que não CPF — e não é "depois", é outro regime

**Medido no book v2: a palavra CPF aparece ZERO vezes. CNPJ aparece 21.** O book prioriza
CNPJ, PNCP e CVM, e sobre dado pessoal determina: *"finalidade e base legal registrada por
tratamento/conector"*, *"minimização"*, *"direitos do titular"* e, para legítimo interesse,
*"avaliação documentada de finalidade, necessidade, balanceamento, salvaguardas e legítima
expectativa"*. A regra de interpretação fecha: a plataforma *"não é uma ferramenta de
intrusão ou vigilância clandestina"*, e *"nada de coleta clandestina ou abuso de dados
pessoais"*.

Três diferenças concretas:

1. **Base pública existe para CNPJ e não existe para CPF.** A Receita publica a base de CNPJ
   como dado aberto. Não há equivalente para CPF: serviço que "consulta CPF" é de acesso
   restrito com credencial própria, ou é comércio irregular de dado pessoal.
2. **Empresa não é titular de dado pessoal; pessoa é.** Com CNPJ, a base legal é trivial —
   dado público. Com CPF, seria preciso ter finalidade, base legal, minimização, retenção e
   fluxo de direitos do titular **prontos antes** da primeira linha do conector.
3. **O primeiro conector define o que o produto é.** Nascer consultando CPF definiria o CSI
   Brasil como exatamente aquilo que o book proíbe — e nenhuma tela bonita depois desfaz isso.

⚠️ **Nuance honesta, registrada para não virar descuido:** o CNPJ de **MEI** carrega nome e às
vezes endereço de pessoa física. Dado pessoal entra pela porta do CNPJ mesmo. Por isso
minimização vale **já no primeiro conector**, não só no dia em que alguém pedir CPF.

### Por que não e-mail primeiro — e este é só de ordem

E-mail **não está proibido**; está na fila. Ele não prova o encanamento: prova a leitura de
formato.

1. **Não tem chave canônica.** O CNPJ **é** o identificador — que é justamente o que o
   Canonical Entity Model precisa. Um e-mail não tem entidade canônica: tem remetente, assunto
   e texto.
2. **A procedência fica ambígua na primeira pergunta.** O contrato exige `source_id`,
   `evidence_id` e `confidence`. Com CNPJ: fonte é a Receita, evidência é o registro
   devolvido, confiança é alta e justificável. Com e-mail: a fonte é o remetente? a caixa? o
   sistema que encaminhou? Começar pelo caso ambíguo é definir o contrato no pior exemplo.
3. **O formato muda sem avisar, e isso aconteceu hoje.** No outro projeto, o portal Chaves na
   Mão entrega lead por e-mail; a especificação teve que ser lida de **uma captura de tela**;
   o campo do imóvel se chama `reference` do lado deles e `propertyRef` do nosso — e sem o
   sinônimo o dado chegaria e seria **ignorado em silêncio**. Nada disso teria dado erro.

**Ordem registrada:** CNPJ prova o caminho inteiro (coletar → normalizar → guardar com
procedência → buscar) com formato estável. E-mail entra depois, com o caminho já provado, e
aí o trabalho é só o formato.

⚠️ **Ainda falta saber o que "e-mail" significa aqui** — caixa nossa recebendo boletins,
aviso de parceiro, ou outra coisa. Isso muda o conector inteiro, e continua na pendência 16.

---

## 19/08/2026, 20h45 — regra permanente: registro a cada tarefa concluída

**Pedido do dono:** ter aqui a mesma regra de registro que existe no Bahia Realty.

**O que estava fraco:** a regra existia, mas como **uma linha numa tabela**. No Bahia Realty
ela é seção própria, com o porquê junto — e é por isso que lá ela pega. Regra escrita de
passagem é regra que se cumpre de passagem.

**O que entrou:**

- `CLAUDE.md` ganhou a seção **"Regra permanente do dono: registro a cada tarefa concluída"**,
  com as **cinco coisas** que todo registro precisa ter: o que foi feito · **o que foi
  medido, com número** · o que eu afirmei e estava errado · o que ficou aberto · o que **não**
  foi feito de propósito.
- `docs/REGRAS-DE-EXECUCAO.md` passou a exigir o registro **dentro** da verificação
  obrigatória — antes de a tarefa poder ser chamada de concluída, junto com tipos, testes e
  build.
- Combinada a **cópia espelhada** em `Documents\RELATORIO COMPLETO CSI BRASIL.md`, como no
  Bahia Realty, para o dono ler sem abrir o repositório.

**A frase que sustenta a regra:** ⚠️ *verde não é registro*. "Os testes passaram" descreve o
status; o registro diz **o que mudou no mundo**. No outro projeto, `succeeded` no banco,
HTTP 200 e teste verde já esconderam cliente sem atendimento, campanha queimando lead e
e-mail que nunca saiu.

**O que não mudou:** nenhuma linha de código. Isto é regra de processo.

---

## 19/08/2026, 20h36 — banco decidido, e a primeira fonte quase

**Duas decisões do dono:**

1. **Banco: PostgreSQL + pgvector.** Busca textual, busca vetorial e grafo inicial ficam
   todos no Postgres. OpenSearch, ClickHouse, Neo4j, Kafka e Temporal **saem do MVP** — sete
   peças a menos para operar antes de existir o primeiro usuário. ⚠️ O teto é conhecido e
   fica escrito: volume de evento e série temporal um dia pede banco analítico, e essa será
   uma decisão **medida**, quando o número aparecer.
2. **Primeira fonte: CNPJ e e-mail.**

**A segunda decisão levantou uma pergunta que precisa de resposta antes de virar código**,
registrada como pendência 16. O plano manda a Fase 2 começar com **um** conector, e as duas
fontes escolhidas são de natureza oposta:

- **CNPJ** é oficial, estruturada, com esquema estável. Prova o caminho inteiro — coletar,
  normalizar, guardar com procedência, buscar — sem lutar contra o formato.
- **E-mail** é o contrário: texto livre, formato que muda sem aviso, remetente decidindo o
  layout.

⚠️ **Isso não é teoria: aconteceu hoje mesmo no outro projeto.** O portal Chaves na Mão
entrega lead por e-mail, não existe ingestão de e-mail no sistema, os leads ficam parados
numa caixa postal — e a especificação do que vem no e-mail teve que ser lida de **uma captura
de tela**. Começar a Fase 2 pelo caminho mais frágil significa depurar formato de e-mail
antes de ter provado que o encanamento funciona.

**Recomendação registrada: CNPJ primeiro, e-mail depois**, com o caminho já provado. E falta
saber o que "e-mail" significa aqui — caixa nossa recebendo boletins, aviso de parceiro, ou
outra coisa. A resposta muda o conector inteiro.

---

## 19/08/2026, 20h30 — a base extraída do Bahia Realty, arquivo por arquivo

**Decisão do dono:** extrair, com uma condição dura — *"isso não pode prejudicar em nada o
projeto Bahia Realty"*.

**A condição virou medição, não promessa.** Antes de começar, gravei a linha de base do
outro projeto: `HEAD 0648db2`, branch `main`, zero arquivos modificados. Trabalhei **só
lendo** de lá. Ao terminar, conferi: **mesmo commit, zero alterações, nenhum commit novo**.

**O que veio, e por quê:**

| Arquivo | Decisão |
|---|---|
| `package.json` | **6 dependências**, não as 40 de lá. Sem SDK de IA, sem gráficos, sem e-mail, sem arrastar-e-soltar — nada que a Fase 1 não use |
| `tsconfig.json` · `biome.json` · `vitest.config.ts` | Extraídos quase inteiros: são a régua, e a régua boa é a mesma |
| `tests/stubs/server-only.ts` | Extraído com o motivo junto: sem ele, o `import "server-only"` derruba todo teste que toque no cliente de serviço |
| `lib/supabase/server.ts` · `service.ts` | Extraídos. O `import "server-only"` veio junto — é ele que **quebra o build** se um componente de navegador importar a chave que ignora RLS |
| `lib/logger.ts` | Extraído **com o limite escrito**: ele não imprime `cause`, e foi isso que escondeu por dois dias a causa de 63 falhas de envio no outro projeto |
| `lib/auth/permissions.ts` | **Adaptado.** Quatro papéis (`owner`, `admin`, `analyst`, `viewer`) em vez dos seis de lá — papel só entra quando existe tela que ele precisa e outra que não pode ver |
| `lib/auth/guards.ts` · `lib/orgs/queries.ts` | Adaptados às rotas e papéis daqui |

**⚠️ Uma sobra de molde interceptada antes de entrar.** O `.gitignore` do Bahia Realty
ignora `docs/superpowers/` — lá os planos são artefato descartável. **Aqui os planos das
Fases 0 e 1 são a especificação executável e estão versionados.** Copiar aquela linha faria
o repositório parar de rastrear os dois planos, sem erro e sem aviso. O `.gitignore` daqui
tem o motivo escrito no lugar da linha, para ninguém "corrigir" isso depois.

**⚠️ O que NÃO foi extraído, de propósito:** `requireMfaSatisfied`. Ele redireciona para uma
tela `/mfa` que aqui não existe, e guarda apontando para página inexistente é pior que guarda
nenhuma. Virou a pendência **15** — registrado, não esquecido.

**⚠️ Uma dívida assumida às claras:** `types/supabase.ts` é um **esboço escrito à mão**,
porque o banco ainda não existe. Ele não descreve o banco: descreve o que o código espera
dele. Como o esboço não modela relacionamentos, as duas consultas com `join` usam
`.returns<>()` — **asserção declarada e comentada**, não inferência. No dia em que o arquivo
for gerado do banco, o `.returns<>()` sai e o tipo inferido precisa bater. Se não bater, o
código está errado, e aquele comentário será a única pista.

**O primeiro teste de verdade:** `tests/permissoes.test.ts`, 7 casos sobre a matriz de
papéis — lógica pura, sem banco. O mais importante deles é *"seção desconhecida é recusada,
não liberada"*: **negar é o padrão**. Quebrei `canAccess` de propósito para devolver `true`
no desconhecido e vi **exatamente esse** teste ficar vermelho, sozinho, antes de restaurar.

**Verificação:** `tsc --noEmit` 0 erros · **7 testes verdes** · `biome check` limpo ·
`next build` completo.

**O que isto NÃO é:** ainda não há banco, migration aplicada, tela de workspace nem
autenticação configurada. A Fase 1 continua dependendo das decisões 2, 3 e 4.

---

## 19/08/2026, 20h — plano da Fase 1 revisado com a regra de rastreabilidade

**A conclusão da revisão é mais estreita do que o problema parecia, e isso é o resultado.**

A regra do Book v2 diz que cada nó e cada aresta precisam ser rastreáveis. A leitura
apressada seria acrescentar `fonte`, `evidência` e `confiança` em toda tabela da Fase 1.
**Seria errado.** As cinco tabelas desta fase — `organizations`, `memberships`, `projects`,
`monitors`, `query_versions` — são **configuração de trabalho**: registram o que o operador
pediu, não o que o sistema descobriu no mundo. Não são nó, aresta nem fato extraído.

Enchê-las de colunas de procedência produziria exatamente o **risco 13** desta lista —
*campo que ninguém preenche* —, que no projeto anterior deixou painéis, alertas e e-mails
automáticos pendurados em campos que nenhuma linha de código escrevia.

**O que a regra exige da Fase 1 é o contrato e a trava**, pelo mesmo motivo que a Tarefa 1
existe: regra que nasce depois da primeira violação já nasceu tarde. A primeira tabela de
conhecimento aparece na Fase 2.

**O que entrou no plano:**

1. **`docs/CONTRATO-DE-PROCEDENCIA.md`** — duas classes declaradas explicitamente
   (`configuracao` / `conhecimento`) e as **7 colunas** obrigatórias na segunda:
   `source_id`, `evidence_id`, `transform_id`, `produced_by_kind`, `produced_by`,
   `produced_at`, `confidence`.
2. **Tarefa 1b — a segunda trava** (`tests/rastreabilidade-do-conhecimento.test.ts`): toda
   tabela declara a classe, a classe é uma das duas, e tabela de conhecimento carrega as 7
   colunas. **Não existe tabela sem classe** — deixar em branco não é neutro, é a forma mais
   comum de uma tabela de conhecimento passar batida.
3. **As cinco tabelas marcadas** `-- @classe: configuracao`, com o porquê escrito ao lado.

**Três decisões de projeto que vale registrar, porque cada uma evita um erro conhecido:**

- **`produced_by_kind` separado de `produced_by`.** A diferença entre *um humano afirmou* e
  *um modelo inferiu* é o que dá ou tira valor de uma evidência — e sumiria no dia em que
  agente e pessoa tivessem id do mesmo formato.
- **`confidence` não pode ter `default` nem `not null`.** Valor padrão inventado vira número
  na tela que ninguém escreveu. Ou o produtor sabe a confiança, ou a coluna fica nula e a
  tela mostra "não informado". Há um caso de teste vermelho só para isso.
- **Na dúvida, é `conhecimento`.** Errar para esse lado custa colunas a mais; errar para o
  outro custa descobrir na Fase 7 que nada é rastreável.

⚠️ **O limite da trava está escrito nela mesma:** ela lê SQL por expressão regular, não
entende SQL, e associa a declaração ao `create table` mais próximo. Por isso o passo "provar
que a trava morde" tem **quatro** casos vermelhos — é ele que prova, não a leitura do código.

⚠️ **E o alerta que sobrevive à revisão:** a trava garante que a coluna **exista**, não que
alguém **escreva** nela. Quem preenche cada uma precisa estar no mapa junto com o conector,
na mesma tarefa da Fase 2 — não depois.

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
