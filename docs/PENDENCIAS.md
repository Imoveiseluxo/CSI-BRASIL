# Pendências — CSI Brasil

> Lista viva do que **ainda falta**. Item resolvido sai daqui e vira parágrafo no relatório
> (`docs/RELATORIO-ATIVIDADES.md`).
>
> **Item novo entra na hora em que aparece** — não no fim da conversa. O que não está escrito
> num lugar só volta a ser descoberto por acaso, semanas depois.

**Atualizado em:** 19/08/2026, 01h10

---

## ✅ Decidido pelo dono em 19/08/2026, 01h04

| O quê | Decisão | O que isso trava |
|---|---|---|
| **Modelo de negócio** | **Plataforma que o dono opera**, vendendo acesso | **Multi-tenancy é obrigatória desde a primeira tabela.** `organization_id` + RLS em toda tabela de domínio, sem exceção. Também libera juridicamente usar o `elite-programa` como referência — a licença da Awave permite faturar com o serviço |
| **Domínio** | **Inteligência corporativa brasileira** | Os conectores da Fase 2 e 4 são brasileiros: CNPJ, PNCP e CVM prioritários, conforme o book. O protótipo de geopolítica entra só como **desenho de tela**, não como escopo |

---

## 🔴 Esperando decisão sua
| **3** | **Banco: começar só com PostgreSQL, ou já montar a pilha completa do book?** | Recomendo PostgreSQL + pgvector no MVP (ver `docs/ROADMAP.md`). A pilha completa — OpenSearch, ClickHouse, Neo4j, Kafka, Temporal — são sete peças para operar antes de existir um usuário. Preciso do seu de acordo para seguir pelo caminho simples |
| **4** | **Qual é a primeira fonte real?** | A Fase 2 começa com **um** conector. Escolher qual define o resto: um feed RSS de agência é o mais simples e já prova o caminho inteiro. Se você tiver uma fonte que interessa comercialmente mais, ela vem primeiro |
| **5** | **De onde vem a base do código?** | A auditoria comparativa recomendou extrair o encanamento do Bahia Realty (multi-tenancy, autenticação, rotinas, LGPD) em vez de começar do zero ou clonar. Isso precisa do seu de acordo, porque significa **extrair arquivo por arquivo**, não clonar e apagar — mais lento no primeiro dia, e evita as sobras que já causaram estrago lá |

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
| 13 | **Campo que ninguém preenche.** No Bahia Realty, três campos de atendimento nunca foram escritos por linha nenhuma de código — e painéis, alertas e e-mails automáticos ficaram pendurados neles | Todo campo que alimenta número na tela precisa ter, no mapa, **quem escreve nele** |
