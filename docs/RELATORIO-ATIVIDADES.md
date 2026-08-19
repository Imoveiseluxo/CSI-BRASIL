# Relatório de Atividades — CSI Brasil

Log de tudo que foi feito no projeto, sessão por sessão. **Mais recente no topo.**

Regra: toda mudança entra aqui, e o relatório é atualizado **durante** a sessão, não só no
fim. Vale desde o primeiro commit.

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
