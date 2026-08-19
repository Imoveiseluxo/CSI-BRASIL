# Regras de execução — valem para QUALQUER tarefa

> Este documento não descreve o produto. Descreve **como se trabalha aqui**, em qualquer
> tarefa, do primeiro dia até o último. É lido antes de codar, não depois de errar.
>
> Cada regra abaixo nasceu de um erro real, medido, em projeto do mesmo dono. Elas chegam ao
> CSI Brasil já pagas — o preço foi cobrado uma vez, em outro lugar.

---

## 🗺️ REGRA ZERO — o mapa vem antes de qualquer coisa

**Abrir `docs/MAPA-DO-SISTEMA.md` antes de qualquer tarefa.** Antes de medir, de procurar no
código, de editar, de escrever teste e de diagnosticar. Não só quando estiver perdido.

**Por que é a regra zero:**

- Quando foi seguida, o acerto veio de primeira: o mapa mostrou que toda uma operação passava
  por uma função só, e o conserto virou um arquivo em vez de dois.
- Quando não foi, uma trava foi instalada em **um** canal e os outros três ficaram abertos.
  **82 registros se perderam** por causa disso.
- O mapa também responde *"isso já existe?"* — e a resposta costuma ser sim.

**O mapa fecha a tarefa também:** processo novo (conector, rotina, agente, trava, caminho de
dado) entra no mapa **na mesma tarefa**. Tarefa com mapa desatualizado **não está concluída**.

⚠️ **Trabalhou no projeto de fora da pasta dele? Abra o mapa assim mesmo.** Já houve uma
sessão inteira trabalhada sem o mapa porque a pasta de trabalho era outra e o arquivo de
instruções não carregou.

---

## As quatro regras do método

1. **Pensar antes de codar** — explicitar as suposições e perguntar quando há dúvida.
2. **Simplicidade primeiro** — código mínimo, sem achismo.
3. **Mudanças cirúrgicas** — mexer só no necessário.
4. **Execução com objetivo** — critério de sucesso definido **antes** de começar.

Foram definidas no fim de um dia em que quase todo o retrabalho veio de agir antes de
verificar. Os casos que as motivaram, todos do mesmo dia:

- uma paleta de cores extraída **contando frequência de hexadecimal** num CSS — pegou cinzas
  genéricos em vez da marca, que estava declarada no próprio arquivo de layout;
- oito registros convertidos para um formato **sem ter visto o modelo inteiro**; só três eram
  daquele formato, e o trabalho foi refeito duas vezes;
- um commit **sem rodar a suíte** — entrou vermelho, seguido de conserto às cegas que colidiu
  de novo;
- um commit levado a produção pondo a **coleta de dados sem a rota que a recebe** — pego
  antes do deploy por conferência, não por método.

Na prática, isso quer dizer:

- **verificar antes de agir, não depois.** Ler o arquivo antes de editar, listar o que existe
  antes de escolher, rodar o teste antes de commitar;
- **não "melhorar" o que não foi pedido** — o diff contém só o que a tarefa exige. Escopo que
  cresce sozinho é como código incompleto chega em produção;
- **perguntar não é falha, é disciplina.**

---

## As cinco regras antitropeços

### 1. Medir antes de afirmar

Existe consulta que confirma? Ela vem **antes** da afirmação. E antes de comemorar um
resultado bom: *que outra explicação daria exatamente este mesmo resultado?*

Achado bom demais costuma ser artefato do método, não descoberta.

### 2. Arquivo se edita com editor, nunca pelo terminal

Terminal serve para **rodar**. `sed` e `echo` já engoliram crase e acento e apagaram conteúdo
em silêncio — inclusive num caso em que a verificação veio verde porque o `sed` **não tinha
aplicado nada**.

### 3. Teste procura o código, não o comentário sobre o código

E **quebrar a própria implementação de propósito**, para ver o teste ficar vermelho, antes de
dar a tarefa por encerrada. Já houve dia com quatro testes verdes que não cobriam nada do que
anunciavam — porque casavam com o comentário explicativo, não com o código.

Teste que nunca falhou não prova nada.

### 4. Corrigir em voz alta o que eu afirmei errado

O dono age com base no que eu digo. Afirmação errada custa o tempo dele. Corrigir cedo é
barato; deixar correr, não.

### 5. Sucesso não é evidência

`succeeded` no banco, HTTP 200 e teste verde **não provam** que o resultado aconteceu.

Um caso real: uma rotina marcada como bem-sucedida escondia três atendimentos que terminaram
em silêncio. Outro: uma escrita em massa reportou sucesso pelo *status* — só o `.select()` de
volta, contando as linhas realmente alteradas, revelou que zero tinham mudado.

**Medir o resultado, nunca o status.** E contar as linhas que a escrita realmente mudou.

---

## Três regras que vieram de erros específicos

### Prompt não é garantia

Instrução no texto de um agente **não garante comportamento**. Uma agente já disse "vou
registrar seu contato" e não chamou a ferramenta — o registro sumiu. Quando a consequência é
real, a trava vai no **servidor**, não no prompt.

### Rede de segurança é por caminho, não por sistema

Trava instalada num caminho **não protege os outros**. Toda trava nova entra no mapa com a
lista dos caminhos que cobre **e dos que não cobre**.

### Erro tem que dizer onde parou

Mensagem genérica que serve para várias causas custa rodadas de investigação. Um erro que
dizia apenas "não foi possível completar a operação" servia, ao mesmo tempo, para servidor de
e-mail fora do ar, endereço de retorno não autorizado e limite de envio — e não havia como
saber qual.

Se a mensagem para o usuário precisa ser genérica por segurança, **o motivo real vai para o
log, sempre.**

---

## Qual rotina usar para cada tipo de pedido

O dono pede em linguagem natural. A tradução é esta:

| O pedido soa como | Rotina |
|---|---|
| "quero planejar", "vamos construir X" | `superpowers:brainstorming`, depois `writing-plans` |
| "constrói essa funcionalidade" | `superpowers:writing-plans` + `executing-plans` |
| "isso não está funcionando", "esse botão quebrou" | `superpowers:systematic-debugging` |
| "revisa o que mudei" | `superpowers:requesting-code-review` |
| "confirma que funciona" | `superpowers:verification-before-completion` |
| "escreve um teste para isso" | `superpowers:test-driven-development` |

---

## Verificação obrigatória antes de dizer "feito"

```bash
npx tsc --noEmit   # 0 erros
npm run test       # verde
npm run build      # build completa
```

Depois: commit → push → **conferir que a publicação ficou pronta**.

Se a mudança tem efeito visível, peça ao dono para abrir e validar, ou confirme você mesmo.
**Não afirme "funciona" sem evidência.**

**E, antes de chamar a tarefa de concluída: o registro.** Regra permanente do dono
(19/08/2026) — toda tarefa concluída vira um parágrafo em `docs/RELATORIO-ATIVIDADES.md`
**no momento em que termina**. Sem o registro, a tarefa não está concluída. Detalhe do que
cada registro precisa conter está no `CLAUDE.md`, seção "Registro".

---

## Anti-padrões — proibido

- ❌ "Acho que está funcionando" sem rodar verificação de tipos e build
- ❌ Dizer que está no ar sem ter conferido a publicação
- ❌ `try/catch` só para esconder erro
- ❌ Comentar código para "ver se resolve"
- ❌ Atualizar dependência ao acaso para "ver no que dá"
- ❌ Deixar `console.log` no código depois de depurar
- ❌ Mudar três coisas para depurar um problema
- ❌ Aplicar correção em produção sem testar
- ❌ Empurrar para a branch principal sem permissão explícita do dono
- ❌ Copiar arquivo de outro projeto sem ler linha por linha

---

## Registro — o que escrever, e quando

| Documento | Quando |
|---|---|
| `docs/RELATORIO-ATIVIDADES.md` | **A cada tarefa concluída**, no momento em que termina. Mais recente no topo. **Tarefa sem registro não está concluída** |
| `docs/PENDENCIAS.md` | O que falta e o que espera decisão — **na hora em que aparece** |
| `docs/MAPA-DO-SISTEMA.md` | Processo novo, ou processo que mudou de comportamento |
| `Documents\RELATORIO COMPLETO CSI BRASIL.md` | Cópia espelhada do relatório, para o dono ler sem abrir o repositório |

**Cinco coisas em cada registro** (detalhe no `CLAUDE.md`): o que foi feito · **o que foi
medido**, com número · o que eu afirmei e estava errado · o que ficou aberto · o que **não**
foi feito de propósito.

⚠️ **Verde não é registro.** *"Os testes passaram"* é status. O registro diz o que mudou no
mundo — que é a diferença entre saber que o código roda e saber que a pessoa foi atendida.

---

## Escalar para o dono — parar e perguntar

- Decisão de produto com mais de uma opção válida
- Coleta de fonte cujo termo de uso não é claro
- Mudança em tabela existente com risco de perder dado
- Necessidade de chave, pacote grande ou serviço externo novo
- Três tentativas sem convergir
- O pedido conflita com a regra de interpretação do book

**Escalar não é falha, é disciplina.** Trabalho ruim é pior que trabalho não feito.

---

## Como falar com o dono

Jefferson **não codifica**. Toda mensagem visível para ele em PT-BR coloquial. Jargão técnico
só em código e comentário técnico.

| Em vez de | Use |
|---|---|
| "schema" | "tabela do banco" |
| "Server Action" | "função do servidor" |
| "Server Component" | "página" |
| "hydration mismatch" | "o servidor mostrou uma coisa e o navegador esperava outra" |
| "TypeError" | "o código tentou usar uma variável que estava vazia" |
| "RLS denied" | "a regra de segurança do banco bloqueou essa consulta" |
