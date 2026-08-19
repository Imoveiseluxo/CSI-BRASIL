# Roadmap — as 11 fases

Fonte: seção 22 do book (`docs/spec/BOOK-CSI-BRASIL.md`). Este arquivo traduz aquela tabela
para o formato que o projeto usa, e registra **em que ordem** as coisas podem existir.

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
| **7 — Cases & Graph** | Casos, relações, grafo v1, Evidence Vault | Investigação corporativa | ⬜ |
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

## Uma discordância entre o book e ele mesmo, que precisa de decisão

A seção 16 sugere PostgreSQL + OpenSearch + ClickHouse + Neo4j + Kafka + Redis + S3 +
Temporal. Duas páginas depois, a mesma seção diz: *"começar como modular monolith + workers
assíncronos, separar serviços somente quando volume, isolamento de segurança ou perfil de
carga justificar. Evitar uma arquitetura de dezenas de microserviços no MVP."*

As duas coisas não cabem juntas no MVP. A recomendação registrada aqui — e sujeita à decisão
do dono, item 3 das pendências — é começar com **PostgreSQL + pgvector** cobrindo busca
textual, busca vetorial e grafo inicial, exatamente como o próprio book admite ao escrever
*"Neo4j ou camada graph sobre PostgreSQL inicialmente"*.

O teto disso é conhecido e não deve ser fingido: volume de evento e série temporal um dia
pede banco analítico. Isso será uma decisão medida, quando o número aparecer — não um chute
agora.

## Definition of Done global (do book)

Código versionado e revisado · testes unitários e de integração · e, acrescentado por este
projeto: **o mapa atualizado na mesma tarefa** e **o teste visto vermelho de propósito antes
de ser dado por bom**.
