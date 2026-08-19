# Pendências — CSI Brasil

> Lista viva do que **ainda falta**. Item resolvido sai daqui e vira parágrafo no relatório
> (`docs/RELATORIO-ATIVIDADES.md`).
>
> **Item novo entra na hora em que aparece** — não no fim da conversa. O que não está escrito
> num lugar só volta a ser descoberto por acaso, semanas depois.

**Atualizado em:** 19/08/2026, 18h45

---

## ✅ Decidido pelo dono em 19/08/2026, 20h36

| O quê | Decisão | O que isso trava |
|---|---|---|
| **Banco** (era o item 3) | **PostgreSQL + pgvector**, não a pilha completa | Busca textual, busca vetorial e grafo inicial ficam todos no Postgres, como o próprio book admite (*"Neo4j ou camada graph sobre PostgreSQL inicialmente"*). OpenSearch, ClickHouse, Neo4j, Kafka e Temporal **saem do MVP**. ⚠️ O teto é conhecido e não deve ser fingido: volume de evento e série temporal um dia pede banco analítico — será decisão **medida**, quando o número aparecer |
| **Primeira fonte** (era o item 4) | **CNPJ** e **e-mail** | ⚠️ **Ordem ainda não definida — ver item 16.** As duas são fontes de natureza oposta, e começar pela errada custa a Fase 2 inteira |

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
| **2** | 🆕 **O produto é só operado por você, ou também instalado no cliente?** (levantado pelo **Book v2**, 19/08/2026) | Em 19/08 às 01h04 você decidiu "plataforma que eu opero, vendendo acesso" — e foi **essa** decisão que abriu a porta jurídica para usar o `elite-programa` como referência, porque a licença da Awave permite faturar com o **serviço**, não com o software. **O Book v2 acrescentou uma opção de `on-premise` / *Enterprise deployment*** ("atender organizações que exigem isolamento, dados locais ou rede privada"). As duas coisas não convivem sem consequência: se o CSI Brasil for instalado no cliente, ele vira **software entregue**, e a porta jurídica que estava aberta fecha de novo. ⚠️ Isso não é detalhe de fase 10 — muda o que pode ser usado como referência **agora**, na Fase 1 |
| **3** | **Banco: começar só com PostgreSQL, ou já montar a pilha completa do book?** | Recomendo PostgreSQL + pgvector no MVP (ver `docs/ROADMAP.md`). A pilha completa — OpenSearch, ClickHouse, Neo4j, Kafka, Temporal — são sete peças para operar antes de existir um usuário. Preciso do seu de acordo para seguir pelo caminho simples |
| **4** | **Qual é a primeira fonte real?** | A Fase 2 começa com **um** conector. Escolher qual define o resto: um feed RSS de agência é o mais simples e já prova o caminho inteiro. Se você tiver uma fonte que interessa comercialmente mais, ela vem primeiro |
| **16** | 🆕 **"CNPJ/e-mail": são duas fontes, e qual vem primeiro?** (19/08/2026, 20h36) | O plano diz que a Fase 2 começa com **um** conector, e as duas escolhidas são de natureza oposta. **CNPJ** é fonte oficial, estruturada, com esquema estável e resposta previsível — prova o caminho inteiro (coletar → normalizar → guardar com procedência → buscar) sem lutar com o formato. **E-mail** é o contrário: texto livre, formato que muda sem aviso, remetente que decide o layout. ⚠️ **Hoje mesmo isso apareceu no outro projeto:** o portal Chaves na Mão entrega lead por e-mail, não existe ingestão, e os leads ficam parados numa caixa postal — e a especificação do que vem no e-mail teve que ser lida de uma captura de tela. **Minha recomendação: CNPJ primeiro**, e-mail depois, com o caminho já provado. **E preciso saber o que "e-mail" significa aqui:** (a) monitorar uma caixa nossa que recebe alertas/boletins, (b) receber lead ou aviso de parceiro, ou (c) outra coisa? A resposta muda o conector inteiro |
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
