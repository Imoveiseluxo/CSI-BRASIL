# Pendências — CSI Brasil

> Lista viva do que **ainda falta**. Item resolvido sai daqui e vira parágrafo no relatório
> (`docs/RELATORIO-ATIVIDADES.md`).
>
> **Item novo entra na hora em que aparece** — não no fim da conversa. O que não está escrito
> num lugar só volta a ser descoberto por acaso, semanas depois.

**Atualizado em:** 19/08/2026, 21h55

---

## ✅ Decidido pelo dono em 19/08/2026, 22h53

| O quê | Decisão | O que isso trava |
|---|---|---|
| **On-premise** (era o item 2) | **NÃO.** Somente operado pelo dono, sem instalação no cliente | Fecha a contradição que o Book v2 abriu. ✅ **A porta jurídica do `elite-programa` continua aberta** — a licença da Awave permite faturar com o **serviço**, e nunca vai existir software entregue. ⚠️ **Consequência para o roadmap:** a *"Enterprise deployment option"* que o v2 lista sai do escopo. Ninguém deve construir em direção a ela — e se um cliente exigir isolamento, a resposta é organização separada na nossa infraestrutura, não instalação na dele |
| **E-mail como fonte** | **Sim — fonte de busca, como as demais** | O e-mail entra no mesmo caminho de todas as fontes: vira **evidência** guardada com hash, e o conteúdo passa a ser pesquisável junto com o resto. Não é caixa de entrada, é fonte. ⚠️ **Falta decidir o MECANISMO**, e ele muda o conector inteiro — ver item 24 |

---

## ✅ Decidido pelo dono em 19/08/2026, 20h36

| O quê | Decisão | O que isso trava |
|---|---|---|
| **Banco** (era o item 3) | **PostgreSQL + pgvector**, não a pilha completa | Busca textual, busca vetorial e grafo inicial ficam todos no Postgres, como o próprio book admite (*"Neo4j ou camada graph sobre PostgreSQL inicialmente"*). OpenSearch, ClickHouse, Neo4j, Kafka e Temporal **saem do MVP**. ⚠️ O teto é conhecido e não deve ser fingido: volume de evento e série temporal um dia pede banco analítico — será decisão **medida**, quando o número aparecer |
| **Primeira fonte** (era o item 4) | **CNPJ primeiro**, e-mail depois | Decidido às 20h50. CNPJ é oficial e estruturado: prova o caminho inteiro (coletar → normalizar → guardar com procedência → buscar) sem lutar com formato, e **é a chave canônica** que o Canonical Entity Model precisa. E-mail entra depois, com o caminho já provado. ⚠️ **Ainda falta saber o que "e-mail" significa aqui** — caixa nossa recebendo boletins, aviso de parceiro, ou outra coisa. Isso muda o conector inteiro. ⚠️ **CPF fica fora** enquanto não houver base legal documentada — ver itens 17 e 18 |

---

## ✅ Decidido pelo dono em 19/08/2026, 20h20

| O quê | Decisão | O que isso destravou |
|---|---|---|
| **De onde vem a base do código** (era o item 5) | **Extrair do Bahia Realty, arquivo por arquivo**, com a condição dura de **não prejudicar aquele projeto em nada** | Feito e verificado: o Bahia Realty terminou no **mesmo commit** (`0648db2`), com **zero arquivos modificados** — trabalhei só lendo. O esqueleto e o encanamento de acesso do CSI existem, com `tsc` limpo, 7 testes verdes, lint limpo e build passando |

---

## ✅ Decidido pelo dono em 19/08/2026, 01h04

| O quê | Decisão | O que isso trava |
|---|---|---|
| **Modelo de negócio** | **Plataforma que o dono opera**, vendendo acesso | **Multi-tenancy é obrigatória desde a primeira tabela.** `organization_id` + RLS em toda tabela de domínio, sem exceção. Também libera juridicamente usar o `elite-programa` como referência — a licença da Awave permite faturar com o serviço |
| **Domínio** | **Inteligência corporativa brasileira** | Os conectores da Fase 2 e 4 são brasileiros: CNPJ, PNCP e CVM prioritários, conforme o book. O protótipo de geopolítica entra só como **desenho de tela**, não como escopo |

---

## 🔴 Esperando decisão sua

| # | O quê | O que eu preciso de você |
|---|---|---|
| **21** | ✅ **RESOLVIDO 19/08 22h50 — trava de destino no lugar** | Campo controlável por quem cadastra a fonte, consumido por uma rotina que faz requisição — caminho clássico para fazer o **servidor** buscar endereço interno que o navegador nunca alcançaria. **Resolver na Tarefa 5 da Fase 2**, quando o conector existir: validar contra **lista de destinos permitidos**, recusar endereço privado, e registrar a tentativa recusada. ⚠️ Não é urgente hoje porque nenhuma rotina lê esse campo ainda — **e é exatamente por isso que precisa estar escrito**, senão nasce junto com o conector sem ninguém lembrar |
| **24** | 🔴 **Como os e-mails chegam até nós?** (19/08/2026, 22h53) | O dono decidiu que e-mail é fonte de busca. **Falta o mecanismo, e ele muda o conector inteiro:** (a) **caixa que lemos** por IMAP — precisa de credencial, e cada leitura é uma conexão nossa; (b) **endereço que recebe** — encaminhamos para um endereço nosso e um webhook entrega o conteúdo, sem credencial de caixa; (c) **exportação manual** de arquivos. ⚠️ Isto não é detalhe: (a) exige guardar senha de caixa de e-mail, que é credencial de acesso amplo; (b) não exige, e é por isso a mais segura. ⚠️ **E vale a advertência que o outro projeto deu hoje:** formato de e-mail muda sem aviso, e a especificação de um deles teve que ser lida de uma captura de tela. Qualquer que seja o mecanismo, o conteúdo cru vira **evidência com hash** antes de qualquer interpretação |
| **18** | 🔴 **A cláusula de finalidade do contrato com a CDL precisa ser lida antes de qualquer consulta de CPF** (19/08/2026, 20h57) | **Correção de algo que eu afirmei errado às 20h50:** escrevi que consulta de CPF "ou é credencial restrita, ou é comércio irregular", tratando o primeiro caminho como exótico. **Não é** — o dono informou que existe **integração com a CDL**, que é justamente a via legítima e contratada. **O que isso muda:** a disponibilidade técnica. **O que isso NÃO muda:** a base legal. Credencial responde *"eu consigo consultar?"*; a LGPD pergunta *"por que, com que finalidade, com que minimização, por quanto tempo e como o titular exerce direitos?"*. ⚠️ **E há um risco específico deste caso, que é o mais provável de morder:** credencial de birô (CDL/SPC) é contratada **para uma finalidade** — tipicamente análise de crédito e consulta cadastral com consentimento ou legítimo interesse do contratante naquela relação. Usá-la para alimentar um produto de inteligência corporativa é **finalidade diferente da contratada** — o que a LGPD chama de finalidade incompatível, e o que costuma estar vedado no próprio contrato do birô. Consequência prática: além do risco jurídico, é o tipo de uso que **faz a credencial ser revogada**. **Próximo passo, e ele é de leitura, não de código:** ler a cláusula de finalidade/uso permitido do contrato com a CDL e transcrever aqui o que ela autoriza |
| **17** | 🟠 **CPF depende de base legal documentada — o acesso técnico existe, a base legal ainda não** (19/08/2026, 20h50, corrigido às 20h57) | Não é "depois": é **outro regime jurídico**. **Medido no book v2: a palavra CPF aparece ZERO vezes; CNPJ aparece 21.** O book exige *"finalidade e base legal registrada por tratamento/conector"*, *"minimização"*, *"direitos do titular"* e, para legítimo interesse, *"avaliação documentada de finalidade, necessidade, balanceamento, salvaguardas e legítima expectativa"* — tudo **antes** da primeira linha do conector. E a regra de interpretação diz que a plataforma *"não é uma ferramenta de intrusão ou vigilância clandestina"*. ⚠️ **Não existe base pública de CPF**: serviço que "consulta CPF" ou é de acesso restrito com credencial própria, ou é comércio irregular de dado pessoal. **Se um dia for necessário**, o caminho é: definir finalidade → escolher e documentar a base legal → minimização → retenção → fluxo de direitos do titular → só então o conector. ⚠️ **Nuance honesta:** o CNPJ de **MEI** carrega nome e às vezes endereço de pessoa física. Ou seja, dado pessoal entra pela porta do CNPJ mesmo — por isso minimização vale já no primeiro conector, não só quando alguém pedir CPF |
| **15** | 🆕 **`requireMfaSatisfied` não foi extraído** (19/08/2026) | O Bahia Realty força o segundo fator antes de entrar no app. Não veio porque redireciona para uma tela `/mfa` que aqui não existe, e guarda apontando para página inexistente é pior que guarda nenhuma. **Entra junto com a tela de MFA**, na fase de autenticação. Registrado para não virar esquecimento |

---

## 🟡 Decidido, esperando a fase chegar

| # | O quê | Quando |
|---|---|---|
| 6 | Teste-vigia do mapa (`tests/mapa-em-dia.test.ts`) | Fase 0, junto com o CI |
| 7 | Threat model e revisão de LGPD | Fase 0 — o book coloca isso na fundação, não depois |
| 8 | Design system | Fase 0 |
| 9 | Rótulo visual de dado simulado | Fase 2, antes do primeiro dado aparecer na tela |

---

## ⚠️ Riscos conhecidos, registrados para não serem redescobertos

| # | Risco | Mitigação combinada |
|---|---|---|
| 10 | **Sobra de molde.** No Bahia Realty, cópia de template deixou configuração apontando para o banco errado, documento de deploy de outro projeto, pacote com nome de template e bot com nome de outra empresa | Extrair de propósito, arquivo por arquivo. Nada entra sem ser lido |
| 11 | **Terceira cópia do mesmo encanamento.** Já existem duas (Bahia Realty e Moradaflow), com fila parada de replicação entre elas | Avaliar extrair o núcleo comum como pacote compartilhado antes de copiar pela terceira vez |
| 12 | **Licença de terceiro.** O `elite-programa` é licenciado pela Awave: pode faturar com o serviço, não com o software, e Trabalho Derivado inclui fork reescrito | Usar apenas como **referência de desenho**. Nenhuma linha copiada. Se o CSI Brasil for produto para instalar no cliente, nem como referência próxima |
| 14 | ✅ **O Book v2 mudou o modelo de dados — plano da Fase 1 já revisado** (19/08/2026, 20h) | A regra do v2 (*"cada nó e cada aresta devem ser rastreáveis a evidência, fonte, Transform, usuário/agente responsável, data e nível de confiança"*) foi incorporada. **Conclusão da revisão, e ela é mais estreita do que parecia:** as cinco tabelas da Fase 1 **não** recebem colunas de procedência, porque são **configuração** — registram o que o operador pediu, não o que o sistema descobriu. Enchê-las de `fonte`/`confiança` criaria justamente o **risco 13** (campo que ninguém preenche). O que a fase ganha é o **contrato** (`docs/CONTRATO-DE-PROCEDENCIA.md`) e a **trava** (Tarefa 1b): toda migration declara `-- @classe: configuracao` ou `conhecimento`, e tabela de conhecimento sem as 7 colunas não entra. ⚠️ **O que continua valendo como alerta:** a trava garante que a coluna exista, **não** que alguém escreva nela — quem preenche precisa estar no mapa junto com o conector, na Fase 2 |
| 13 | **Campo que ninguém preenche.** No Bahia Realty, três campos de atendimento nunca foram escritos por linha nenhuma de código — e painéis, alertas e e-mails automáticos ficaram pendurados neles | Todo campo que alimenta número na tela precisa ter, no mapa, **quem escreve nele** |
