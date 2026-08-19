# Pendências — CSI Brasil

> Lista viva do que **ainda falta**. Item resolvido sai daqui e vira parágrafo no relatório
> (`docs/RELATORIO-ATIVIDADES.md`).
>
> **Item novo entra na hora em que aparece** — não no fim da conversa. O que não está escrito
> num lugar só volta a ser descoberto por acaso, semanas depois.

**Atualizado em:** 19/08/2026, 01h

---

## 🔴 Esperando decisão sua

| # | O quê | O que eu preciso de você |
|---|---|---|
| **1** | 🔴 **O CSI Brasil é produto para vender, plataforma que você opera, ou ferramenta interna?** | **É a decisão que trava todas as outras.** Se for **plataforma que você opera** e vende acesso, multi-tenancy é obrigatória desde a primeira tabela. Se for **produto que o cliente instala**, muda o modelo inteiro e some a multi-tenancy. Se for **ferramenta interna**, o MVP encolhe bastante e várias fases saem. Sem essa resposta, qualquer tabela que eu criar tem chance de estar errada |
| **2** | 🔴 **Inteligência corporativa brasileira ou geopolítica internacional?** | O book descreve inteligência corporativa do Brasil — CNPJ, PNCP, CVM, risco de empresa. O protótipo `geopolitics-live-stream` é geopolítica internacional. Os **motores** servem aos dois; as **fontes e as regras de negócio**, não. Escolher define quais conectores nascem na Fase 2 |
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
