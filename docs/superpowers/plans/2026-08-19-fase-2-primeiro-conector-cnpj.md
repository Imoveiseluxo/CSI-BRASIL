# Fase 2 — Primeiro conector: CNPJ · Plano de Implementação

> **Pré-requisito:** Fase 1 concluída — banco criado, migrations aplicadas, RLS provada
> cortando entre organizações (19/08/2026, 21h55).

**Objetivo desta fatia:** provar o caminho inteiro de dado com **um** conector —
**consultar → guardar a evidência → derivar a entidade → achar de novo** — com procedência
preenchida de verdade, não só declarada.

⚠️ **O critério de sucesso não é "o conector funciona".** É: *dado um CNPJ, existe no banco
uma empresa cuja origem eu consigo apontar — qual fonte, qual artefato, quando, e com que
confiança — e o artefato original está guardado para conferir.* Sem isso, é mais um
importador.

---

## A decisão de fonte, e por que não é a que o book aponta primeiro

O book lista **Receita Federal — Dados Abertos** como fonte oficial prioritária. Mas os Dados
Abertos da Receita são **o dump completo**: dezenas de arquivos ZIP, vários gigabytes por
mês, ~60 milhões de estabelecimentos. Isso é um projeto de ETL com armazenamento,
descompactação e carga incremental.

**Como primeiro conector, ele prova a coisa errada.** Gastaríamos a fatia inteira em
infraestrutura de carga e não teríamos exercitado procedência, evidência nem busca.

**Decisão registrada: começar por consulta sob demanda a uma API pública que serve os mesmos
dados cadastrais da Receita** (um CNPJ por chamada). A origem do dado é a mesma; o que muda é
o modo de acesso.

| | Consulta sob demanda (escolhido) | Dump completo (depois) |
|---|---|---|
| Prova o caminho inteiro | ✅ numa chamada HTTP | ❌ semanas de ETL antes do primeiro registro |
| Cobertura | só quem for consultado | o país inteiro |
| Custo de infraestrutura | nenhum | armazenamento + carga |
| Quando faz sentido | **agora** | quando houver busca em massa |

⚠️ **O dump não sai do roadmap** — ele volta quando a pergunta for *"quais empresas de tal
CNAE em tal cidade"*, que consulta sob demanda não responde. Isso fica registrado para não
parecer que a fonte oficial foi trocada por conveniência.

⚠️ **A procedência tem que registrar QUAL API respondeu**, não "Receita Federal". Se um dia a
API intermediária estiver desatualizada, a diferença entre *"veio da Receita"* e *"veio da
API X que diz vir da Receita"* é a diferença entre uma evidência e uma suposição.

---

## Uma lacuna do contrato de procedência, descoberta agora

O `docs/CONTRATO-DE-PROCEDENCIA.md` prevê duas classes: `configuracao` e `conhecimento`.
**A primeira tabela real de dado mostrou que falta uma terceira.**

A tabela de **evidência** guarda o artefato bruto — o JSON que a fonte devolveu. Ela não é
`configuracao` (não é o que o operador pediu) e não encaixa em `conhecimento` como está: as
sete colunas exigem `evidence_id`, e a evidência **é** a evidência — apontaria para si mesma.
Também não tem `transform_id`, porque não foi derivada de nada: foi capturada.

**Correção do contrato, nesta fase:** três classes.

| Classe | O que guarda | Colunas obrigatórias |
|---|---|---|
| `configuracao` | o que o operador pediu | nenhuma extra |
| `evidencia` | o artefato **capturado**, cru | `source_id`, `collected_at`, `content_hash`, `collected_by_kind` |
| `conhecimento` | o que foi **derivado** de uma evidência | as 7 do contrato |

⚠️ **`content_hash` não é enfeite:** é o que permite dizer *"este artefato não mudou desde
que foi coletado"*. Evidência sem hash é cópia, não evidência — e a Fase 7 inteira depende
disso.

---

## Arquivos desta fase

| Caminho | Responsabilidade |
|---|---|
| `docs/CONTRATO-DE-PROCEDENCIA.md` | acrescentar a classe `evidencia` |
| `tests/rastreabilidade-do-conhecimento.test.ts` | passar a aceitar e exigir a nova classe |
| `supabase/migrations/0004_fontes_e_evidencias.sql` | `sources` e `evidence` |
| `supabase/migrations/0005_empresas.sql` | `companies` — a primeira tabela de conhecimento |
| `lib/sources/cnpj.ts` | o conector: consulta, valida, devolve artefato + campos |
| `lib/sources/cnpj-normaliza.ts` | lógica pura: JSON da fonte → campos da empresa |
| `lib/companies/ingest.ts` | grava evidência, deriva a empresa, preenche procedência |
| `tests/cnpj-normaliza.test.ts` | a normalização, sem rede |
| `tests/cnpj-validacao.test.ts` | validação de CNPJ (dígito verificador) |

---

### Tarefa 1: A terceira classe no contrato e na trava

**Antes de qualquer tabela nova**, pelo mesmo motivo de sempre.

- [ ] Acrescentar a classe `evidencia` ao `CONTRATO-DE-PROCEDENCIA.md`, com as 4 colunas e o
      porquê de `content_hash`.
- [ ] Estender `tests/rastreabilidade-do-conhecimento.test.ts`: aceitar `evidencia` como
      classe válida e exigir as 4 colunas dela.
- [ ] **Provar quebrando:** migration `@classe: evidencia` sem `content_hash` → vermelho;
      classe `evidencia` completa → verde.
- [ ] Rodar as duas travas. Verde.

### Tarefa 2: `sources` e `evidence`

- [ ] `0004_fontes_e_evidencias.sql`:
  - `sources` (`@classe: configuracao`) — qual fonte, qual endpoint, ativa ou não.
  - `evidence` (`@classe: evidencia`) — `source_id`, `content` (jsonb), `content_hash`,
    `collected_at`, `collected_by_kind`, `organization_id`, RLS.
  - ⚠️ **Sem policy de UPDATE nem DELETE em `evidence`** — mesma regra de `query_versions`:
    evidência que pode ser reescrita não é evidência.
- [ ] Aplicar e **conferir no banco**: RLS ligada, e `update` numa evidência afeta **zero
      linhas** — contando as linhas, não pelo status, porque o Postgres não dá erro.

### Tarefa 3: Validação e normalização — lógica pura, sem rede

- [ ] `lib/sources/cnpj-validacao.ts`: dígito verificador. **Rejeita antes de consultar** —
      CNPJ inválido não vira chamada externa nem evidência.
- [ ] `lib/sources/cnpj-normaliza.ts`: JSON da fonte → `{ razao_social, nome_fantasia,
      situacao, data_abertura, cnae_principal, municipio, uf, capital_social }`.
- [ ] Testes com JSON real gravado como amostra, **sem rede**.
- [ ] ⚠️ **Campo ausente vira `null`, nunca string vazia nem zero.** No projeto anterior, um
      número inventado por padrão virou número na tela que ninguém havia medido.

### Tarefa 4: `companies` — a primeira tabela de conhecimento

- [ ] `0005_empresas.sql` (`@classe: conhecimento`) com as **7 colunas de procedência**, e
      `confidence` **sem** `default` e **sem** `not null`.
- [ ] `unique (organization_id, cnpj)`.
- [ ] Aplicar e conferir.

### Tarefa 5: A ingestão que preenche a procedência

- [ ] `lib/companies/ingest.ts`: consulta → grava `evidence` com hash → deriva a empresa →
      grava `companies` **apontando para a evidência**, com `produced_by_kind = 'rotina'`,
      `produced_at`, `transform_id = null` (coleta direta) e `confidence` explícito.
- [ ] **Registrar no mapa quem escreve cada coluna de procedência** — na mesma tarefa.
- [ ] ⚠️ **A conferência final não é "gravou":** pegar um CNPJ real, e a partir da linha em
      `companies` chegar à evidência, e da evidência ao JSON original. Se esse caminho não
      fecha, a fase não está pronta por mais verde que esteja.

---

## O que fica de fora desta fatia, e por quê

**Busca, uploads, fila e normalização de notícia** — o resto da Fase 2 do roadmap. Entram
depois que este caminho estiver provado ponta a ponta. Uma fatia vertical fina que funciona
vale mais que quatro horizontais pela metade.

**Autenticação e telas.** A ingestão roda por rotina; ver o resultado na tela é a fatia
seguinte.

**O dump da Receita**, pelo motivo registrado acima.
