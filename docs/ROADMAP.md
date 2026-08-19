# Roadmap — as 11 fases

Fonte: a seção de roadmap do book (`docs/spec/BOOK-CSI-BRASIL.md`). Este arquivo traduz
aquela tabela para o formato que o projeto usa, e registra **em que ordem** as coisas podem
existir.

> ⚠️ **Atualizado para o Book v2.0 (19/08/2026).** O v1 tinha 22 seções e **8 motores**; o
> v2 tem 25 seções e **10 motores**. Os dois novos são **Investigation / Transform** e
> **Evidence & Cases Engine** — não é reorganização de texto, é camada de produto nova.
> O que mudou está no relatório de 19/08. A versão anterior do texto está preservada em
> `docs/spec/BOOK-CSI-BRASIL-v1.md`, porque as decisões tomadas até 01h daquele dia foram
> tomadas sobre ela.

## A regra que define a ordem

Nenhuma fase pode afirmar o que a anterior não sustenta. Score sem evidência guardada é
opinião; alerta sem score explicável é ruído com hora marcada. Por isso a ordem abaixo é de
**dependência**, não de preferência.

| Fase | Escopo | Saída | Estado |
|---|---|---|---|
| **0 — Fundação** | Documentação de método, arquitetura, threat model, LGPD, design system, CI/CD | Base governada | 🟡 em andamento |
| **1 — Core** | Auth, workspace, projetos, monitores, usuários e RBAC | Produto navegável | ⬜ |
| **2 — Data MVP** | Web/news + uploads + fila + normalização + busca | Primeiro monitoramento útil | ⬜ |
| **3 — Intelligence MVP** | NER, entidades, extração, sentimento, deduplicação | Dados estruturados | ⬜ |
| **4 — Brazil Data Hub** | CNPJ + PNCP + CVM prioritários | Enriquecimento oficial | ⬜ |
| **5 — Events & Analytics** | Clusters, dashboards, geografia, scores iniciais | Inteligência acionável | ⬜ |
| **6 — Extraction Studio** | Schemas, lotes, revisão, exportação | Diferencial comercial | ⬜ |
| **7 — Investigation, Cases & Graph** | **Transform Registry**, **Playbooks**, casos, relações, grafo v1, **Evidence Vault e Data Lineage** | Investigação corporativa **auditável** | ⬜ |
| **8 — Copilot & Agents** | Ask Intelligence, multiagentes, evals | IA operacional | ⬜ |
| **9 — Multimodal** | Imagem, áudio, vídeo, OCR avançado | Cobertura ampliada | ⬜ |
| **10 — Mobile & Enterprise** | App, SSO, auditoria avançada, SLA | Enterprise | ⬜ |

## O MVP vendável — o que o book manda NÃO incluir

O book é explícito: *"MVP vendável — não incluir tudo"*. O corte é este:

Workspace e RBAC · Projetos e Monitores · Web/news e uploads · Busca e filtros ·
Deduplicação · Extração de entidades · Company Intelligence (CNPJ) · PNCP básico ·
Sentimento por entidade · Clusterização inicial de eventos · Extraction Studio ·
Painel e alertas · Exportação · Copilot com evidências.

Ou seja: **fases 0 a 6, mais a parte de evidência da 7.** Fases 8, 9 e 10 ficam fora do
primeiro produto vendável.

### O que o v2 acrescentou ao recorte — a Fase de Investigation Engine

O v2 lista, além do MVP acima, um bloco próprio que antes não existia:

- **Transform Registry** com versionamento, permissões, custo e evidência
- **Playbooks** iniciais: *Investigar Empresa*, *Investigar Evento* e *Verificar Alegação*
- **Graph Workspace** com expansão, filtros, caminhos e Collections
- **Case Workspace** com grafos, evidências, notas, tarefas e trilha de auditoria
- **Data Lineage obrigatório** e indicador de cobertura de coleta
- **Connector SDK / manifest** para fontes internas e de parceiros

⚠️ **E uma regra de projeto que o v2 escreve em caixa alta, e que muda modelagem:**
*"o grafo não é decoração. Cada nó e cada aresta devem ser rastreáveis a evidência, fonte,
Transform, usuário/agente responsável, data e nível de confiança."* Isso não é feature da
Fase 7 — é coluna obrigatória em toda tabela que guarde nó ou aresta, desde a primeira.
Descobrir isso depois significa reescrever o modelo de dados.

⚠️ **O v2 também mantém o `elite-programa` fora do caminho crítico**: ele diz que a camada
multiagente pode *orquestrar* Playbooks, mas **não deve substituir** o Transform Registry,
o Data Engine nem o Evidence Vault.

## Uma discordância entre o book e ele mesmo, que precisa de decisão

✅ **RESOLVIDA pelo dono em 19/08/2026: PostgreSQL + pgvector.**

A seção 16 sugere PostgreSQL + OpenSearch + ClickHouse + Neo4j + Kafka + Redis + S3 +
Temporal. Duas páginas depois, a mesma seção diz: *"começar como modular monolith + workers
assíncronos, separar serviços somente quando volume, isolamento de segurança ou perfil de
carga justificar. Evitar uma arquitetura de dezenas de microserviços no MVP."*

As duas coisas não cabem juntas no MVP. A decisão é começar com **PostgreSQL + pgvector**
cobrindo busca textual, busca vetorial e grafo inicial, exatamente como o próprio book admite
ao escrever *"Neo4j ou camada graph sobre PostgreSQL inicialmente"*. **OpenSearch,
ClickHouse, Neo4j, Kafka e Temporal saem do MVP.**

O teto disso é conhecido e não deve ser fingido: volume de evento e série temporal um dia
pede banco analítico. Isso será uma decisão medida, quando o número aparecer — não um chute
agora.

## Definition of Done global (do book)

Código versionado e revisado · testes unitários e de integração · e, acrescentado por este
projeto: **o mapa atualizado na mesma tarefa** e **o teste visto vermelho de propósito antes
de ser dado por bom**.
