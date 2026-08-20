# Contrato de procedência

O Book v2 escreve como regra de projeto:

> *"O grafo não é decoração. Cada nó e cada aresta devem ser rastreáveis a evidência, fonte,
> Transform, usuário/agente responsável, data e nível de confiança."*

Isto **não é feature da Fase 7**. É coluna obrigatória desde a primeira tabela que guarde
conhecimento — descobrir depois significa reescrever o modelo de dados.

---

## Quatro classes de tabela, declaradas explicitamente

> ⚠️ **Eram duas até 19/08/2026.** A terceira apareceu quando a primeira tabela real de dado
> foi desenhada, na Fase 2 — e é bom que tenha aparecido assim: contrato que nunca encosta
> num caso real é opinião.
>
> A tabela de **evidência** guarda o artefato bruto que a fonte devolveu. Ela não é
> `configuracao` (não é o que o operador pediu) e não cabia em `conhecimento`: as sete colunas
> exigem `evidence_id`, e a evidência **é** a evidência — apontaria para si mesma. Também não
> tem `transform_id`, porque não foi derivada de nada. Foi **capturada**.
>
> ⚠️ **A quarta apareceu em 20/08/2026**, quando a base pública de CNPJ da Receita entrou. Pela
> mesma razão: o contrato encostou num caso real e não coube. São 28 milhões de linhas vindas
> do **mesmo** arquivo, do **mesmo** endereço, com o **mesmo** hash — repetir `source_id`,
> `collected_at`, `content_hash` e `collected_by_kind` em cada uma multiplicaria o disco sem
> acrescentar informação nenhuma. A procedência passou a morar **por referência**.

## As classes

Toda migration que cria tabela declara a classe numa linha de comentário **imediatamente
acima** do `create table`:

```sql
-- @classe: configuracao
-- @classe: evidencia
-- @classe: conhecimento
-- @classe: referencia
```

**`configuracao`** — registra o que o **operador** pediu: organizações, membros, projetos,
monitores, versões de consulta, preferências. Descreve o nosso próprio sistema.

**`evidencia`** — guarda o artefato **capturado**, cru, do jeito que a fonte devolveu: o JSON
da resposta, o PDF baixado, o HTML da página. Não interpreta nada.

**`conhecimento`** — registra o que o sistema **derivou de uma evidência**: entidade, relação,
fato extraído, evento, resultado de Transform.

**`referencia`** — base **pública**, igual para todo cliente, somente-leitura, carregada em
massa: a base de CNPJ da Receita Federal, e o que vier depois no mesmo formato. Identificada
pelo prefixo obrigatório **`rf_`**.

### As colunas obrigatórias em `referencia`

| Onde | O que é exigido |
|---|---|
| Toda tabela `rf_`, exceto a âncora | **`carga_id`** apontando para `rf_carga` |
| A âncora `rf_carga` | **`origem_url`**, **`origem_tipo`**, **`content_hash`**, **`concluida_em`** |

⚠️ **`origem_tipo` só aceita `receita` ou `espelho`.** Em 20/08/2026 foi medido que o servidor
da Receita (`dadosabertos.rfb.gov.br`, 200.152.38.155:443) **não aceita conexão** do nosso
ambiente, enquanto `gov.br` e o espelho respondem em menos de 1s. Registrar "veio da Receita"
o que veio de terceiro seria a afirmação sem lastro que este contrato inteiro existe para
impedir. A conferência por amostra contra a API da Minha Receita é o que fecha a brecha.

⚠️ **`concluida_em` nulo significa carga que não terminou**, e as linhas dela não podem ser
tratadas como completas. Carga pela metade que se parece com carga completa deixa a rede com
buraco sem ninguém ver — foi o que aconteceu na primeira carga real, quando o `COPY` deu certo
e o passo seguinte falhou.

⚠️ **Esta classe não é uma porta de saída da regra de multi-tenancy.** Tabela `rf_` não tem
`organization_id` porque não guarda dado de cliente — e a guarda
`toda-tabela-e-multi-tenant.test.ts` exige o prefixo `rf_` em **qualquer** tabela sem
`organization_id`, além de proibir política de escrita nelas. A exceção é estreita e está sob
teste, não sob confiança.

### As colunas obrigatórias em `evidencia`

| Coluna | Pergunta que responde |
|---|---|
| `source_id` | De qual **fonte** veio? |
| `collected_at` | **Quando** foi capturado |
| `content_hash` | **Este artefato mudou desde então?** |
| `collected_by_kind` | Humano, agente ou rotina capturou? |

⚠️ **`content_hash` é o que separa evidência de cópia.** Sem ele não dá para afirmar que o
artefato guardado é o mesmo que a fonte devolveu — e a Fase 7 (Evidence Vault, cadeia de
evidência) depende inteiramente disso.

⚠️ **Tabela de `evidencia` não tem policy de UPDATE nem DELETE.** Mesma regra de
`query_versions`: evidência que pode ser reescrita não é evidência.

⚠️ **Não existe quarta opção, e não existe tabela sem classe.** Deixar em branco não é
neutro: é a forma mais comum de uma tabela de conhecimento passar batida. A trava reprova.

⚠️ **Na dúvida, é `conhecimento`.** O custo de errar para esse lado são colunas a mais numa
tabela. O custo de errar para o outro é descobrir na Fase 7 que nada é rastreável.

⚠️ **A fronteira sutil, e ela já apareceu:** `query_versions` é `configuracao` — é histórico
do que o **operador** pediu. O **resultado** daquela consulta, que a Fase 2 vai guardar, é
`conhecimento`. Confundir os dois é o erro fácil aqui.

---

## As colunas obrigatórias em `conhecimento`

| Coluna | Pergunta que responde | Tipo |
|---|---|---|
| `source_id` | De qual **fonte** veio? | `uuid` (referência) |
| `evidence_id` | Qual **artefato guardado** sustenta isto? | `uuid` (referência) |
| `transform_id` | Qual **operação** produziu isto? `null` = coleta direta | `uuid` (referência) |
| `produced_by_kind` | **Humano, agente ou rotina?** | `text` com CHECK |
| `produced_by` | **Quem**, nominalmente | `uuid` |
| `produced_at` | **Quando** | `timestamptz` |
| `confidence` | **Quanto se confia**, de 0 a 1 | `numeric(3,2)` com CHECK |

### Por que `produced_by_kind` existe separado de `produced_by`

Sem ele, *"quem afirmou isto"* some no dia em que um agente e uma pessoa tiverem id do mesmo
formato. E a diferença entre **um humano ter afirmado** e **um modelo ter inferido** é
justamente o que dá ou tira valor de uma evidência.

### Por que `confidence` não pode ter `default` nem `not null`

Valor padrão inventado vira **número na tela que ninguém escreveu**. Ou o produtor sabe a
confiança e escreve, ou a coluna fica nula e a tela mostra *"não informado"*.

⚠️ Isto vem de erro real no projeto anterior: três campos de atendimento existiam, nenhuma
linha de código escrevia neles, e painéis, alertas e e-mails automáticos ficaram pendurados
em número que nunca saiu de zero — por semanas, sem ninguém perceber.

---

## O que este contrato NÃO faz

**Ele garante que a coluna exista. Não garante que alguém escreva nela.**

Essa é a diferença que custou caro no projeto anterior, e é o motivo de esta seção existir.
**Quem preenche cada coluna de procedência precisa estar escrito no
`docs/MAPA-DO-SISTEMA.md` junto com o conector, na mesma tarefa** — não depois.

Imutabilidade de evidência (nada de UPDATE/DELETE em tabela de evidência), o **Transform
Registry** e o **Provenance Graph** são da Fase 7. Este contrato existe para que a Fase 7
tenha o que ligar.
