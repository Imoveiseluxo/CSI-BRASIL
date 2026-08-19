# CLAUDE.md — CSI Brasil

Este arquivo orienta o Claude Code quando ele trabalha neste projeto.

## O que é este projeto

**CSI Brasil** — plataforma brasileira de inteligência corporativa, mídia e fontes abertas.
Monitora fontes autorizadas e públicas, transforma conteúdo em dado estruturado, resolve
entidades, identifica relações, agrupa eventos, mede risco e oportunidade, e **entrega
evidência rastreável para decisão**.

**Duas decisões do dono, tomadas em 19/08/2026, que valem para tudo daqui em diante:**

1. **É uma plataforma que o dono OPERA**, vendendo acesso — não é software entregue ao
   cliente. Consequência dura: **multi-tenancy desde a primeira tabela**, `organization_id` +
   RLS sem exceção.
2. **O domínio é inteligência corporativa BRASILEIRA** — CNPJ, PNCP e CVM prioritários. Não é
   geopolítica internacional.

- **Especificação:** `docs/spec/BOOK-CSI-BRASIL.md` (**Book v2.0, 19/08/2026**). O PDF original é a fonte autoritativa. ⚠️ O v2 acrescentou o **Investigation Engine** (Transform Registry, Playbooks, Graph/Case Workspace, Data Lineage) e passou de **8 para 10 motores** — as decisões tomadas em 19/08 até 01h foram sobre o v1, preservado em `docs/spec/BOOK-CSI-BRASIL-v1.md`.
- **Roadmap:** `docs/ROADMAP.md` — 11 fases (0 a 10), com o recorte do MVP vendável.
- **Repositório:** `Imoveiseluxo/CSI-BRASIL`
- **Dono:** Jefferson. Ele **não codifica** — ver "Como falar com o dono".

> ⚠️ **Ainda não existe nada em produção.** Enquanto for assim, "está funcionando" significa
> "o teste passou", não "o cliente foi atendido". No dia em que houver produção, esta frase
> muda de dono — ver a regra de sucesso mais abaixo.

---

## 🔴 REGRA DE INTERPRETAÇÃO — vem do próprio book, e vale mais que tudo aqui

> Quando houver conflito entre **velocidade** e **segurança, integridade da evidência,
> legalidade ou auditabilidade**, prevalecem segurança, integridade, legalidade e
> auditabilidade.

O CSI Brasil é uma plataforma de inteligência sobre **fontes abertas e dados autorizados** —
não é ferramenta de intrusão nem de vigilância clandestina. Recurso que só funciona
contornando termo de uso, autenticação alheia ou barreira técnica de um site **não entra**,
mesmo que o cliente peça e mesmo que seja fácil.

### O que isso proíbe, na prática

| Proibido | Por quê |
|---|---|
| Dado na tela sem origem rastreável | Toda afirmação precisa apontar para a evidência que a sustenta |
| Score que aparece pronto, sem o porquê | O book exige score **explicável** — a conta fica à vista |
| Coleta que ignora `robots.txt` ou termo de uso da fonte | Legalidade prevalece sobre cobertura |
| Simulação exibida sem rótulo de simulação | Captura de tela de dado inventado vira notícia de verdade |
| Dado pessoal coletado sem base legal | Seção 20 do book, e LGPD |

---

## 🗺️ REGRA ZERO — o mapa vem antes: `docs/MAPA-DO-SISTEMA.md`

**Abrir o mapa antes de qualquer tarefa** — antes de medir, de procurar no código, de editar,
de escrever teste e de diagnosticar. Não só quando estiver perdido.

**E o mapa fecha a tarefa:** processo novo (conector, cron, agente, trava, caminho de dado)
entra no mapa **na mesma tarefa em que é criado**. Tarefa com mapa desatualizado não está
concluída.

Mapa velho não é documentação atrasada — é **conselho errado dado com confiança**, e custa
mais tempo do que não ter mapa nenhum.

---

## ⚙️ Regras de execução: `docs/REGRAS-DE-EXECUCAO.md`

O documento completo de **como se trabalha aqui** — o método, as cinco regras antitropeços
com os erros reais que as motivaram, qual rotina usar para cada tipo de pedido, os
anti-padrões proibidos e quando escalar. **Leia antes de codar, não depois de errar.**

O que segue abaixo é o resumo; o detalhe, com os casos que originaram cada regra, está lá.

## Método de trabalho (vale para qualquer tarefa)

1. **Pensar antes de codar** — explicitar suposições e perguntar quando há dúvida.
2. **Simplicidade primeiro** — código mínimo, sem achismo.
3. **Mudanças cirúrgicas** — mexer só no necessário. Escopo que cresce sozinho entrega coisa errada.
4. **Execução com objetivo** — critério de sucesso definido **antes** de começar.

### As cinco regras que evitam os tropeços conhecidos

Estas vieram de erros reais, medidos em outro projeto do mesmo dono. Nascem aqui já valendo.

1. **Medir antes de afirmar.** Existe consulta que confirma? Ela vem antes da afirmação. E
   antes de comemorar: *que outra explicação daria exatamente este resultado?*
2. **Arquivo se edita com editor, nunca pelo terminal.** Terminal serve para rodar. `sed` e
   `echo` já engoliram acento e apagaram conteúdo em silêncio.
3. **Teste procura o código, não o comentário sobre o código.** E quebrar a própria
   implementação de propósito, para ver o teste ficar vermelho, antes de dar a tarefa por
   encerrada. Teste que nunca falhou não prova nada.
4. **Corrigir em voz alta o que eu afirmei errado.** O dono age com base no que eu digo;
   afirmação errada custa o tempo dele.
5. **Sucesso não é evidência.** `succeeded` no banco, HTTP 200 e teste verde não provam que o
   resultado aconteceu. Medir o **resultado**, nunca o status.

### Erro tem que dizer onde parou

Mensagem genérica que serve para várias causas custa rodadas de investigação. Todo erro
tratado precisa **separar as hipóteses**: qual fonte, qual etapa, qual regra. Se a mensagem
para o usuário precisa ser genérica (segurança), o motivo real vai para o log — sempre.

---

## Registro

| Documento | Quando escrever |
|---|---|
| `docs/RELATORIO-ATIVIDADES.md` | **Toda** mudança, mais recente no topo. Atualizar durante a sessão, não só no fim |
| `docs/PENDENCIAS.md` | O que falta e o que espera decisão — **na hora em que aparece**, não no fim da conversa |
| `docs/MAPA-DO-SISTEMA.md` | Processo novo ou processo que mudou de comportamento |

### Regra permanente do dono (19/08/2026): registro a cada tarefa concluída

**Toda tarefa concluída vira um registro em `docs/RELATORIO-ATIVIDADES.md` no momento em que
termina** — não no fim da conversa, não "depois eu documento". É a mesma regra que vale no
Bahia Realty desde 30/07/2026, e ela existe porque o que não é escrito na hora volta a ser
descoberto por acaso, semanas depois.

**Uma tarefa não está concluída sem o registro.** O registro é parte da entrega, como o teste
é — não um passo seguinte.

**O que cada registro precisa ter**, porque relatório que só diz "feito" não serve para nada:

1. **O que foi feito**, em português que o dono entenda sem jargão.
2. **O que foi medido** — o número, o comando, a resposta. *"Funcionou"* não é medição.
3. **O que eu afirmei e estava errado**, se for o caso. Afirmação errada não corrigida custa
   o tempo de quem age com base nela.
4. **O que ficou aberto**, e por quê. Entrega parcial escrita é honesta; entrega parcial
   silenciosa vira dívida invisível.
5. **O que NÃO foi feito de propósito** — decisão registrada não é esquecimento. Quem ler
   depois precisa saber a diferença.

**A cópia espelhada:** a mesma versão vai para
`C:\Users\Windows\Documents\RELATORIO COMPLETO CSI BRASIL.md`, como no Bahia Realty — para o
dono ler sem precisar abrir o repositório.

⚠️ **Verde não é registro.** *"Os testes passaram"* descreve o status; o registro precisa
dizer **o que mudou no mundo**. No projeto anterior, `succeeded` no banco, HTTP 200 e teste
verde já esconderam cliente sem atendimento, campanha queimando lead e e-mail que nunca saiu.

---

## Convenções

1. **PT-BR em interface, documentação e mensagem.** Código (variáveis, funções, arquivos,
   tabelas, colunas) em inglês.
2. **Arquivos:** kebab-case. **Componentes React:** PascalCase. **Variáveis e funções:**
   camelCase. **Tabelas e colunas:** snake_case.
3. **Server Actions retornam `{ ok: true; data?: T } | { ok: false; error: string }`.** Nunca
   jogar exceção sem tratamento.
4. **Toda tabela de domínio tem `organization_id`** + RLS habilitada. Sem exceção — o modelo
   de dados do book começa por *tenant*.
5. **Todo input externo valida com Zod** antes de tocar o banco.
6. **Server Action nunca devolve `error.message` do Postgres direto** — traduz para linguagem
   leiga e loga o original no servidor.

---

## Regras absolutas (violar = bug crítico)

### Evidência
1. **Nada é exibido sem proveniência.** Todo conteúdo guarda endereço de origem, data de
   publicação e data de coleta, antes de qualquer processamento.
2. **Score é explicável.** A conta que gerou o número fica disponível junto do número.
3. **Dado simulado é rotulado na interface**, não só no código.

### Banco e segurança
4. **`organization_id` + RLS em toda tabela de domínio.** Policies usando helpers de acesso.
5. **Chave de serviço nunca em código que roda no navegador.**
6. **Dado que veio de fora é hostil** — id de URL, webhook e feed se validam antes de virar
   chamada externa ou consulta.
7. **Exportação de CSV neutraliza fórmula** (célula começando com `=`, `+`, `-`, `@`).
8. **Aprovação humana antes de migration destrutiva** (drop de coluna ou tabela).

### TypeScript
9. **Nunca `any`.** Sem saber o tipo, perguntar ou pesquisar.
10. **Nunca `@ts-ignore` / `@ts-expect-error`** sem comentário explicando.

---

## Como falar com o dono

Jefferson não codifica. Toda mensagem visível para ele em PT-BR coloquial. Jargão técnico só
em código e comentário técnico.

| Em vez de | Use |
|---|---|
| "schema" | "tabela do banco" |
| "Server Action" | "função do servidor" |
| "RSC / Server Component" | "página" |
| "TypeError" | "o código tentou usar uma variável que estava vazia" |
| "RLS denied" | "a regra de segurança do banco bloqueou essa consulta" |

**Nunca diga que algo está no ar sem ter conferido o deploy.** Commit não é deploy; push não é
deploy; HTTP 200 não é prova.

---

## Verificação obrigatória antes de dizer "feito"

```bash
npx tsc --noEmit   # 0 erros
npm run test       # verde
npm run build      # build completa
```

Depois: commit → push → conferir que a publicação ficou pronta.

Se a mudança tem efeito visível, peça ao dono para abrir e validar, ou confirme você mesmo.
**Não afirme "funciona" sem evidência.**

---

## Escalar para o dono (parar e perguntar)

- Decisão de produto com mais de uma opção válida
- Coleta de fonte cujo termo de uso não é claro
- Mudança em tabela existente com risco de perder dado
- Você tentou três vezes e não convergiu
- O pedido conflita com a regra de interpretação lá em cima

**Escalar não é falha, é disciplina.**
