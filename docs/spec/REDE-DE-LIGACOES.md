# Rede de ligações de um perfil, e exportação para planilha

**Especificação — 20/08/2026.** Aprovada pelo dono em 20/08/2026, 08h45.

Partir de um CNPJ e descobrir **todas as ramificações possíveis**: sócios, filiais, outras
empresas dos mesmos sócios, e empresas ligadas por endereço, telefone ou e-mail
compartilhado. Depois, **exportar a rede para uma planilha** com a procedência junto.

Isto é o **Investigation Engine** do Book v2 — o motor que fez o book ir de 8 para 10.

---

## 1. As duas decisões do dono, tomadas em 20/08/2026

| Decisão | O que ela trava |
|---|---|
| **Começa por empresa (CNPJ)**, com a estrutura preparada para pessoa entrar depois | A busca que **parte de uma pessoa** não é construída agora. O que já existe hoje na base pública — nome de sócio — aparece **como sócio de uma empresa**, que é como a Receita publica. Ver seção 6 |
| **Carrega a base completa da Receita** no nosso Postgres | É a única forma de fazer o **caminho de volta**: as fontes gratuitas de consulta (Minha Receita, BrasilAPI) devolvem os sócios de um CNPJ, mas **não** respondem *"quais outras empresas esse sócio tem"* |

---

## 2. O que foi medido antes de desenhar

Base de **julho/2026**, compactada:

| Arquivo | Tamanho | Papel na rede |
|---|---|---|
| **Sócios** (10 partes) | **0,65 GB** | As arestas do grafo. É o coração |
| **Empresas** (10 partes) | **1,3 GB** | Razão social, natureza jurídica, capital. Dá nome aos nós |
| **Estabelecimentos** (10 partes) | **5,0 GB** | Endereço, telefone, e-mail, CNAE, matriz/filial. Liga empresas que **não** compartilham sócio |
| Simples | 0,29 GB | Porte tributário. Acessório |

**Total: ~7,3 GB compactados.** Descompactado e indexado, a **estimativa** é 60 a 90 GB —
e está escrito como estimativa de propósito: só a carga real dá o número.

Supabase do CSI: plano **pro**, banco com **11 MB** em 20/08/2026 08h35.

⚠️ **A ordem de carga segue o valor por GB, não a ordem do site da Receita:** Sócios +
Empresas custam ~2 GB e já respondem *"todas as outras empresas deste sócio"*, que é a
pergunta central. Estabelecimentos custam 5 GB sozinhos e entram depois, com o custo real
medido antes.

---

## 3. O obstáculo de rede, e o que ele faz com a procedência

⚠️ **O servidor da Receita não aceita conexão do nosso ambiente.** Medido em 20/08/2026:

```
dadosabertos.rfb.gov.br (200.152.38.155:443)  -> conexão esgota o tempo (21s, sem resposta)
www.gov.br/receitafederal/dados               -> HTTP 200 em 1,07s
espelho (Casa dos Dados, via Cloudflare)      -> HTTP 200 em 0,52s
```

Não é lentidão: é conexão recusada, enquanto outros hosts do mesmo governo respondem.

**Consequência que num produto de procedência não é detalhe:** baixar de espelho significa
que **a fonte da evidência é o espelho**, não a Receita. Dizer *"veio da Receita"* quando veio
de terceiro é exatamente a afirmação sem lastro que a regra de interpretação proíbe.

**Como fica resolvido:**

1. A fonte é registrada **honestamente como o espelho**, com a URL exata e a data do arquivo.
2. Uma **amostra** de cada carga é conferida contra a API da Minha Receita, que responde
   direto. Divergência vira alarme registrado, **nunca silêncio**.
3. Se um dia a Receita ficar alcançável, a fonte muda e a conferência continua.

---

## 4. A camada de referência, e a exceção que ela abre

A base da Receita **não pertence a nenhum cliente**: é pública e idêntica para todos.
Duplicá-la por organização seria multiplicar dezenas de GB sem ganho nenhum.

Por isso entra uma **camada de referência**: tabelas públicas, somente-leitura, **sem**
`organization_id`.

⚠️ **Isso abre uma exceção numa regra absoluta do projeto** — *"toda tabela de domínio tem
`organization_id` + RLS, sem exceção"*. A regra passa a ler:

> Toda tabela **de dados de cliente** tem `organization_id` + RLS, sem exceção.
> Tabelas da **camada de referência** (base pública, igual para todos, somente-leitura) não
> têm — e são identificadas pelo prefixo `rf_`.

**O que impede a exceção de virar buraco:**

- Prefixo `rf_` obrigatório, e **nada** fora dele pode dispensar `organization_id`.
- O teste `toda-tabela-e-multi-tenant.test.ts` passa a **exigir** que qualquer tabela sem
  `organization_id` comece com `rf_` — a exceção fica sob teste, não sob confiança.
- Tabela `rf_` **nunca** recebe dado de cliente. Escrita só pela rotina de carga.

---

## 4.1 O que a medição mostrou, e que muda o que a rede pode afirmar

Linha real do arquivo de Sócios de julho/2026, baixada e lida em 20/08/2026:

```
"44410972";"2";"ADEMIR VIEIRA";"***567468**";"49";"20211129";"";"***000000**";"";"00";"8"
```

⚠️ **A Receita publica o CPF do sócio MASCARADO** — só seis dígitos do meio.
`***567468**` não identifica ninguém sozinho.

**Consequência direta na promessa "todas as outras empresas deste sócio":** a ligação é feita
por **nome + documento mascarado juntos**. Isso acerta na esmagadora maioria dos casos, mas
**não é prova**: dois homônimos com os mesmos seis dígitos existem.

**Como fica tratado, e isso não é opcional:**

- A ligação por sócio sai rotulada como **provável**, com o critério à vista, nunca como fato.
- O grau de confiança vai na coluna `confidence` — que, pelo contrato de procedência, **não
  tem valor padrão**: sem critério, fica nula, não vira número inventado.
- Na planilha, a mesma etiqueta acompanha a linha.

⚠️ Num produto de inteligência, **ligação errada é pior que ligação ausente**. Quem recebe uma
rede acredita nela.

**Layout confirmado no dado real** (não de memória): 11 colunas, separador `;`, todos os
campos entre aspas, codificação **LATIN-1**, sem cabeçalho, fim de linha `\n`.
**2.019.150 sócios** só na décima parte do arquivo.

---

## 4.2 O modelo que serve para empresa, e-mail e perfil social

Decisão do dono em 20/08/2026: **a mesma estrutura de busca e ramificação vale para perfil de
redes sociais e para e-mail**, e **todo resultado tem de poder ser expandido para extração**.

Por isso a rede não é feita de "empresas": é feita de **identificadores** e **ligações**.

| Peça | O que é | Exemplos |
|---|---|---|
| **Entidade** | O nó da rede | empresa, pessoa, perfil |
| **Identificador** | Como aquela entidade é reconhecida | CNPJ, CPF mascarado, e-mail, domínio, telefone, handle de rede social, URL de perfil |
| **Ligação** | A aresta, sempre com **evidência** e **grau de confiança** | é sócio de, é filial de, compartilha endereço, compartilha domínio de e-mail, perfil oficial de |

⚠️ **Conector novo não muda o modelo.** Uma fonte nova só acrescenta identificadores e
ligações — a tela de rede, a expansão e a exportação continuam as mesmas. É isso que faz
"a mesma estrutura" valer para CNPJ, e-mail e rede social sem reescrever nada.

⚠️ **Toda ligação nasce apontando para uma evidência.** Aresta sem evidência não entra — é a
mesma regra que já vale para empresa, onde `evidence_id` é obrigatório no banco.

⚠️ **Cada fonte tem sua própria regra de coleta**, decidida quando o conector é escrito:
`robots.txt`, termo de uso e API oficial. Isso já está no `CLAUDE.md` do projeto e não se
repete a cada conector.

---

## 5. As tabelas

### 5.1 Camada de referência (`rf_`)

| Tabela | O que guarda | Índices que importam |
|---|---|---|
| `rf_empresas` | `cnpj_basico` (8 primeiros dígitos), razão social, natureza jurídica, capital, porte | PK `cnpj_basico` |
| `rf_socios` | `cnpj_basico`, nome do sócio, documento, qualificação, data de entrada, representante | `cnpj_basico` e **`documento_socio`** (o caminho de volta) |
| `rf_estabelecimentos` *(fase 2)* | CNPJ completo, matriz/filial, situação, endereço, telefone, e-mail, CNAE | `cnpj_basico`, e por endereço/telefone/e-mail |
| `rf_carga` | **A procedência da camada**: qual arquivo, de qual URL, de qual mês, quando carregado, quantas linhas, hash | — |

⚠️ **`rf_carga` não é burocracia.** Sem ela, a camada de referência seria a única parte do
sistema com dado sem origem rastreável — dentro de um produto cuja premissa é o contrário.

### 5.2 O que é do cliente

A rede investigada — o recorte que **este cliente** pediu, com os saltos que ele escolheu —
é dado dele: fica em tabela com `organization_id` e RLS, como todo o resto.

---

## 6. Onde está a fronteira legal, e por que ela não bloqueia isto

O arquivo de Sócios traz **nome de pessoa física** e **CPF parcialmente mascarado**. É
registro público, publicado pela própria Receita.

| O que pode agora | O que continua travado |
|---|---|
| Partir de um **CNPJ** e mostrar seus sócios, inclusive pessoas físicas, como a Receita publica | Partir de uma **pessoa** e varrer tudo ligado a ela |
| Seguir de um sócio para as outras empresas **dele**, dentro de uma investigação que começou numa empresa | Busca livre por nome ou CPF de pessoa, sem empresa de origem |

⚠️ O que separa os dois não é capacidade técnica — depois da carga, as duas são a mesma
consulta. É **finalidade**, e o book exige finalidade e base legal registradas **antes** do
conector. Enquanto isso não estiver escrito, a busca centrada em pessoa não existe na tela.
Ver itens 17 e 18 das pendências.

⚠️ **Minimização desde já:** o CPF mascarado do sócio **não vai para a tela nem para a
planilha**. Ele serve para ligar registros dentro do banco, e só.

---

## 7. A exportação

Uma linha por **ligação**, não por empresa — é a ligação que responde à pergunta.

| Coluna | Vem de |
|---|---|
| origem, tipo do vínculo, destino | a rede |
| saltos até a origem | a rede |
| fonte, mês da base, data da coleta, hash da carga | `rf_carga` |

⚠️ **Neutralização de fórmula é obrigatória** (regra absoluta 7): célula começando com `=`,
`+`, `-` ou `@` é prefixada. Sem isso, uma razão social com `=` vira fórmula executada quando
o arquivo abre no Excel.

⚠️ **Planilha sem procedência é dado solto.** Com fonte, data e hash em cada linha, é prova —
e é a diferença que o book cobra.

---

## 8. O que esta especificação NÃO faz, de propósito

- **Não constrói busca centrada em pessoa** — seção 6.
- **Não carrega Estabelecimentos na primeira entrega** — seção 2. Sem eles não existe vínculo
  por endereço/telefone; isso é limite conhecido e declarado, não esquecimento.
- **Não promete grafo em Neo4j.** A decisão de 19/08 é Postgres, e o próprio book admite
  *"camada graph sobre PostgreSQL inicialmente"*.
