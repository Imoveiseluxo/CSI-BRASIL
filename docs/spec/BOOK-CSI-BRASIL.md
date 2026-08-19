# Book CSI Brasil — texto extraído do PDF

> Extraído de `CSI_Brasil_Book_v2_Completo_Claude.pdf` (**versão 2.0, 19/08/2026**) em
> 19/08/2026, com `pdftotext -layout -enc UTF-8`. **O PDF é a fonte autoritativa** — este
> arquivo existe para que a especificação viaje junto do código e seja pesquisável.
> Tabelas do PDF saem embaralhadas na extração; em caso de dúvida sobre uma tabela,
> volte ao PDF.
>
> A versão anterior está preservada em `BOOK-CSI-BRASIL-v1.md`, porque as decisões
> registradas até 19/08 às 01h foram tomadas sobre **aquele** texto. O que mudou está
> resumido no relatório de 19/08.

---

CSI BRASIL

BOOK EXECUTIVO + TÉCNICO PARA IMPLEMENTAÇÃO COM CLAUDE

Plataforma Brasileira de Inteligência
Corporativa, Mídia e Fontes Abertas

Arquitetura de produto, monitoramento, investigação por entidades e grafos,
OSINT corporativo, extração estruturada, Evidence Vault, Knowledge Graph, IA
multiagente, alertas, LGPD, roadmap e contrato de implementação.

  OBJETIVO DO DOCUMENTO
  Servir como especificação central para Claude e para a equipe de desenvolvimento do CSI Brasil. O
  material descreve o que construir, por que construir, como organizar os módulos, quais restrições
  observar e quais critérios mínimos devem ser atendidos antes de considerar cada entrega concluída.

Versão 2.0 | 19 de agosto de 2026
Documento de produto e engenharia.
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

CONTROLE DO DOCUMENTO

Como usar este book

O documento foi escrito para funcionar simultaneamente como visão de
produto, PRD de alto nível, arquitetura de referência e instrução de execução
para o Claude.

Elemento               Uso esperado
Visão e princípios
Módulos funcionais     Alinhar escopo, posicionamento e decisões de produto.
Arquitetura e dados
Agentes de IA          Converter diretamente em épicos e histórias de usuário.
LGPD e segurança
Roadmap e backlog      Orientar decisões de backend, dados, busca, IA e
Contrato Claude        infraestrutura.

                       Definir responsabilidades, ferramentas, contratos de saída
                       e limites.

                       Impedir que funcionalidades sejam construídas fora das
                       regras de privacidade, segurança e acesso legítimo.

                       Estabelecer uma sequência de implementação incremental
                       e testável.

                       Dar autonomia para execução sem pedir confirmações
                       desnecessárias, mas com checkpoints técnicos objetivos.

REGRA DE INTERPRETAÇÃO

Quando houver conflito entre velocidade e segurança, integridade da evidência, legalidade ou
auditabilidade, prevalecem segurança, integridade, legalidade e auditabilidade. O CSI Brasil é uma
plataforma de inteligência corporativa sobre fontes abertas e dados autorizados - não uma
ferramenta de intrusão ou vigilância clandestina.

Status do repositório awave-agents

O repositório https://github.com/Imoveiseluxo/awave-agents.git foi informado como público, mas o
mecanismo de leitura disponível durante a consolidação deste book continuou retornando 404/cache
miss. Por isso, este documento não atribui características de código que não puderam ser auditadas. A
estratégia de integração está definida no Anexo A e deve ser aplicada após auditoria técnica do
repositório.

                                                                                        CSI Brasil | 2
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas
MAPA DO BOOK

Sumário executivo do conteúdo

Seção  Conteúdo
1
2      Tese do produto e posicionamento

3      Referências funcionais:
4      Kribrum.Pro/Kribrum.OSINT + Maltego

5      Princípios de produto CSI Brasil
6
7      Arquitetura funcional em 10 motores
8
9      Fontes e conectores brasileiros
10     Monitoramento, temas, objetos e queries
11     Extraction Studio
       Company Intelligence
12     Document, Image, Audio & Video Intelligence
       Event, Narrative, Crisis & Opportunity Intelligence
13
14     CSI Investigation Engine, Knowledge Graph,
15     Playbooks e Cases
16
17     Evidence Vault, Data Lineage e verificabilidade
18
       Busca, filtros e Ask Intelligence
19     Geo Intelligence e dashboards
20     Alertas e Action Engine
21     Arquitetura técnica
22     Modelo de dados
23
24     APIs, Transforms e contratos
25
       Camada multiagente
       Segurança, LGPD e governança
       UX, telas e navegação
       Roadmap, backlog e critérios de aceite
       Modelo comercial e métricas
       Contrato de execução para Claude
       Master Prompt para Claude

                                                                                        CSI Brasil | 3
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Seção  Conteúdo
A      Integração awave-agents
B      Glossário e referências

                                                                                        CSI Brasil | 4
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

01 - ESTRATÉGIA

Tese do produto e posicionamento

O CSI Brasil não deve nascer como mais um social listening. O produto deve
conectar descoberta, identificação, extração, verificação, relacionamento,
análise e ação.

Definição

CSI Brasil é uma plataforma brasileira de inteligência corporativa, mídia e fontes abertas. Ela monitora
fontes autorizadas e públicas, transforma conteúdos em dados estruturados, resolve entidades,
identifica relações, agrupa eventos, mede risco e oportunidade e entrega evidências rastreáveis para
decisão.

Proposta de valor central

     DESCOBRIR -> IDENTIFICAR -> EXTRAIR -> ENRIQUECER -> RELACIONAR -> VERIFICAR ->
     ANALISAR -> ALERTAR -> DECIDIR

Problema que o CSI Brasil resolve

 Fragmentação: informação relevante está distribuída entre imprensa, sites, redes, dados públicos,
     PDFs, portais governamentais e sistemas internos autorizados.

 Volume: equipes não conseguem ler, classificar e relacionar manualmente milhares de menções.
 Baixa estruturação: as ferramentas tradicionais contam menções, mas não necessariamente

     convertem conteúdo em entidades, fatos, valores, contratos, empresas e relações.
 Baixa verificabilidade: muitos insights gerados por IA não preservam evidência, origem e

     confiança.
 Baixa acionabilidade: monitoramento termina em dashboards, quando deveria terminar em

     alertas, oportunidades, casos, CRM, API ou decisão executiva.

Segmentos prioritários

Segmento                  Casos de uso

PR e Comunicação          Reputação, crises, narrativas, share of voice, mídia e
Marketing                 influenciadores.
Inteligência corporativa
Vendas B2B                Campanhas, concorrência, tendências, intenção,
                          oportunidade e conteúdo.

                          Empresas, investimentos, movimentos estratégicos, M&A,
                          expansão, relações e sinais de mercado.

                          Detecção de empresas, projetos, investimentos, licitações e
                          gatilhos comerciais.

                                        CSI Brasil | 5
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Segmento                             Casos de uso
Segurança da informação
Jurídico e compliance                Exposição pública de ativos e marcas, riscos
Real estate / logística / indústria  informacionais e evidências em fontes abertas permitidas.

                                     Monitoramento de atos públicos, processos/contratos
                                     disponíveis, reputação e trilha de evidência.

                                     Investimentos, novos empreendimentos, expansão,
                                     terrenos, infraestrutura, fornecedores e contratos.

                                                                                        CSI Brasil | 6
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

02 - BENCHMARK FUNCIONAL

Referências funcionais: Kribrum.Pro/Kribrum.OSINT +
Maltego

O Kribrum é usado como referência pública de lógica de produto. O CSI Brasil
deve implementar arquitetura própria, código próprio e identidade própria.

O que a referência pública demonstra

A descrição pública do Kribrum.Pro apresenta uma plataforma de monitoramento e análise de mídia,
Internet, redes sociais, fóruns, avaliações e canais públicos em mensageiros. O produto também enfatiza
distribuição temática, tonalidade, geografia, estatísticas, relatórios e alertas. A documentação pública do
Kribrum.OSINT descreve módulos para grafos, importação SQL/NoSQL, planilhas, normalização, direitos
de acesso, enriquecimento e análise de dependências.

Capacidade de referência               Decisão para CSI Brasil

Temas/objetos persistentes             Adotar como Monitores e Entidades.
Monitoramento de fontes heterogêneas   Adotar com conectores específicos e governança por fonte.
Tonalidade por menção ao objeto        Adotar e ampliar para stance, ironia e confiança.
Mapa e recortes geográficos            Adotar com geografia brasileira até município.
Originais, duplicatas e republicações  Adotar com canonicalização e similaridade semântica.
Estatísticas interativas               Adotar com drill-down até evidência original.
Grafos de relações                     Adotar como Knowledge Graph nativo.
Relatórios e alertas                   Adotar e ampliar para canais omnichannel, webhooks e
                                       ações.

IMPORTANTE

Inspirar-se em funcionalidades publicamente descritas não significa copiar software, telas, código,
marca, dados proprietários ou mecanismos internos. O CSI Brasil deve ter arquitetura e
implementação independentes.

Princípio derivado

O produto não deve girar em torno de uma caixa de pesquisa. Deve girar em torno de projetos
persistentes, entidades, monitores, eventos, evidências e relações, permitindo investigação longitudinal.

                                                                                        CSI Brasil | 7
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

02B - INVESTIGAÇÃO E LINK ANALYSIS

CSI Investigation Engine - princípios derivados do
Maltego

O Maltego entra no CSI Brasil como referência funcional para investigação
orientada a entidades, pivôs sucessivos, Transforms, grafos de relacionamento,
linhagem de dados, evidências e gestão de casos. O CSI Brasil deve implementar
esses princípios de forma própria, especializada em dados brasileiros e
integrada ao monitoramento contínuo.

O que o Maltego acrescenta à arquitetura

Capacidade de referência            Decisão de produto para o CSI                       Componente CSI
                                    Brasil

Entities                            Tratar empresa, pessoa                              Canonical Entity Model
                                    pública/profissional, domínio,
                                    endereço, documento, contrato,
                                    evento, local e demais objetos como
                                    entidades tipadas e versionadas.

Transforms                          Uma entidade vira entrada para ações                CSI Transform Registry
                                    controladas que consultam fonte/API
                                    e retornam novas entidades, relações
                                    ou evidências.

Machines                            Automatizar sequências e fan-out de                 Investigation Playbooks
                                    consultas repetíveis.

Graph / Link Analysis               Explorar relações diretas e indiretas,              Graph Workspace
                                    hubs, clusters, caminhos e nós
                                    compartilhados.

Data Hub / Connectors               Adicionar fontes sem acoplar o core a               CSI Data Hub + Connector SDK
                                    um único provedor.

Search / Pivoting                   Usar qualquer resultado validado                    Recursive Pivot Search
                                    como novo ponto de investigação.

Data Lineage                        Explicar de qual fonte e de qual                    Provenance Graph
                                    sequência de operações veio cada
                                    descoberta.

Collections                         Agrupar milhares de nós semelhantes                 Graph Collections / Clusters
                                    para reduzir ruído visual.

                                                                                                                 CSI Brasil | 8
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Capacidade de referência             Decisão de produto para o CSI                      Componente CSI
Evidence                             Brasil
Cases
Custom integrations                  Preservar origem, timestamp, hash,                 Evidence Vault
On-premise                           artefato e limitações da coleta.

                                     Centralizar grafos, evidências, notas,             Case Workspace
                                     tarefas, responsáveis e relatórios.

                                     Permitir dados internos e APIs                     Private Connectors / Enterprise
                                     autorizadas do cliente.                            Sources

                                     Atender organizações que exigem                    Enterprise deployment option
                                     isolamento, dados locais ou rede
                                     privada.

REGRA DE PROJETO: o grafo não é decoração. Cada nó e cada aresta devem ser rastreáveis a
evidência, fonte, Transform, usuário/agente responsável, data e nível de confiança.

Modelo operacional de investigação

O fluxo investigativo passa a operar em paralelo ao monitoramento. Uma menção encontrada pelo
Listening Engine pode originar uma investigação; uma entidade descoberta no Graph pode, por sua vez,
gerar novos monitores e alertas. Essa bidirecionalidade é um diferencial central do CSI Brasil.

  MONITORAR -> DETECTAR -> CONVERTER EM ENTIDADE -> EXECUTAR TRANSFORMS -> RESOLVER
  IDENTIDADE -> RELACIONAR -> VERIFICAR -> PRESERVAR EVIDÊNCIA -> ABRIR/ATUALIZAR CASO ->
  GERAR AÇÃO

CSI Transforms

Transform é a unidade executável de investigação. Recebe uma ou mais entidades de entrada, aplica
uma consulta permitida a uma fonte, normaliza o retorno e produz entidades, relações, atributos ou
evidências. Um Transform nunca deve escrever informação incerta diretamente na entidade canônica
sem passar pela política de resolução e confiança.

Transform              Entrada       Saída                           Fonte/motor                        Objetivo

company.to_cnpj        Empresa       CNPJ /                          Receita/dados oficiais             Encontrar/confirmar
                                     CompanyProfile                  ou cache interno                   cadastro empresarial

cnpj.to_public_contra  CNPJ          Contrato / Órgão /              PNCP                               Relacionar compras e
cts                                  Valor                                                              contratos públicos

company.to_cvm         Empresa/CNPJ  Registro CVM /                  CVM                                Enriquecer
                                     Documento                                                          companhia regulada

company.to_news_ev     Empresa       Conteúdo / Evento               Índice CSI                         Descobrir eventos e
ents                                                                                                    narrativas

                                                                                                                  CSI Brasil | 9
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Transform             Entrada            Saída                 Fonte/motor              Objetivo

document.extract_ent  Documento          Entidades / Fatos /   Extraction Engine        Estruturar
ities                                    Relações                                       documento

event.expand_entities Evento             Empresas / Pessoas /  Knowledge Graph          Expandir atores de
                                         Locais                                         um evento

entity.verify         Qualquer entidade  VerificationResult    Fontes prioritárias      Validar
                                                                                        identidade/atributo
relationship.explain Aresta              EvidencePath          Evidence Vault
                                                                                        Explicar por que duas
                                                                                        entidades estão
                                                                                        relacionadas

TransformDefinition { id, version, input_entity_types[], output_entity_types[], provider, legal_scope,
auth_mode, timeout_ms, rate_limit, cache_ttl, cost_units, confidence_policy, evidence_policy,
retry_policy, enabled }

Investigation Playbooks

Playbook é um fluxo versionado que combina vários Transforms em sequência e/ou paralelo. Deve
possuir pré-condições, orçamento de custo, limites de expansão, critérios de parada, passos que exigem
revisão humana e saída estruturada.

Playbook                         Entrada                                                Fluxo resumido

Investigar Empresa               Nome/CNPJ                                              Resolver empresa -> cadastro ->
                                                                                        endereços -> documentos ->
                                                                                        notícias/eventos -> contratos públicos
                                                                                        -> relações -> resumo verificável

Investigar Evento                Evento/menção                                          Identificar atores -> locais -> valores ->
                                                                                        fonte original -> republicações ->
                                                                                        empresas -> documentos -> linha do
                                                                                        tempo

Verificar Alegação               Texto/fato                                             Extrair alegações -> procurar
                                                                                        evidências -> comparar fontes ->
                                                                                        classificar
                                                                                        suporte/contradição/incerteza

Investigar Contrato Público      PNCP/contrato                                          Órgão -> fornecedor -> valores -> itens
                                                                                        -> documentos -> vínculos
                                                                                        empresariais -> eventos relacionados

Expandir Relação                 Entidade A/B                                           Explicar aresta -> localizar
                                                                                        intermediários -> caminhos
                                                                                        alternativos -> evidências -> confiança

                                                                                                        CSI Brasil | 10
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

CSI Data Hub e Connector SDK

O CSI Data Hub deve funcionar como catálogo governado de fontes. Conectores nativos, parceiros e
integrações privadas compartilham o mesmo manifesto técnico. O core deve depender do contrato do
conector, e não da implementação de um fornecedor específico.

Classe                         Exemplos                   Responsável                   Governança

Nativo oficial                 Receita/CNPJ, PNCP, CVM,   Equipe CSI                    Alta - priorizar fonte
                               Dados.gov.br                                             primária

Plataforma/API parceira        Notícias, mídia, social    Fornecedor + CSI              Conforme contrato/licença
                               permitido, cyber/market
                               data

Privado do cliente             CRM, ERP, data warehouse,  Cliente                       Escopo restrito ao
                               base documental                                          workspace

Upload controlado              PDF, DOCX, XLSX, CSV,      Usuário autorizado            Proveniência e classificação
                               áudio, vídeo, imagem                                     obrigatórias

Data Lineage, cobertura e evidência

Toda descoberta investigativa deve preservar uma trilha de proveniência. Quando a fonte indicar que
existe um universo maior que o efetivamente coletado, o CSI Brasil deve armazenar quantidade
esperada, quantidade obtida e razão de cobertura para impedir que uma coleta parcial seja interpretada
como completa.

Campo mínimo                                              Finalidade

source_ref                                                URL, API, arquivo ou identificador da fonte

transform_id + version                                    Ação que originou o dado

input_entity_ids                                          Entidades usadas como ponto de partida

output_entity_ids                                         Entidades/fatos produzidos

observed_at / collected_at                                Tempo do fato observado e tempo da coleta

evidence_hash                                             Hash do artefato ou snapshot preservado

confidence                                                Confiança calculada e/ou revisada

expected_count / actual_count                             Cobertura quando aplicável

coverage_ratio                                            actual_count / expected_count, com flag de coleta parcial

actor                                                     Usuário, agente ou processo que executou a ação

                                                                                                       CSI Brasil | 11
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Fusão das três camadas de referência

Referência/camada         Contribuição conceitual                                       Resultado no CSI Brasil

Kribrum                   Monitoramento, temas, eventos,                                Listening + Analytics
                          sentimento, geografia, alertas

Maltego                   Entidades, Transforms, pivôs, grafos,                         Investigation + Graph + Evidence
                          evidência, casos

Brasil Data Intelligence  CNPJ, PNCP, CVM, transparência,                               Enrichment + Verification
                          dados oficiais nacionais

CSI Brasil                Une as três camadas com Extraction                            Plataforma integrada
                          Studio, Knowledge Graph, scores,
                          Copilot e Action Engine

  FRONTEIRA OBRIGATÓRIA: usar apenas fontes públicas, licenciadas ou legitimamente autorizadas;
  respeitar termos de uso, autenticação, finalidade, minimização e LGPD. O CSI Brasil não deve ser
  projetado para contornar controles de acesso ou montar perfis pessoais indiscriminados.

03 - DOUTRINA DE PRODUTO

Princípios obrigatórios do CSI Brasil

Princípio                             Aplicação prática
Evidence-first
Entity-first                          Nenhuma conclusão relevante deve perder a fonte, o trecho de
Human-reviewable                      evidência, a data e a confiança.
Privacy by design
Tool least privilege                  Conteúdos são insumos; entidades e eventos são unidades de
API-first                             inteligência.
Auditability
Progressive intelligence              Toda automação crítica precisa permitir revisão humana e correção.
Brazil-native
No dark patterns                      Minimização, retenção, finalidade, acesso e base legal devem nascer
                                      no modelo de dados.

                                      Agentes e usuários recebem apenas ferramentas e permissões
                                      necessárias.

                                      Toda capacidade de negócio relevante deve ser exposta por
                                      contratos claros e versionados.

                                      Coleta, enriquecimento, IA, edição e exportação devem produzir
                                      logs auditáveis.

                                      MVP útil antes de multimodalidade e grafos avançados.

                                      Português brasileiro, CNPJ, estados/municípios, bases oficiais e
                                      contexto regulatório local.

                                      Nada de coleta clandestina, bypass de autenticação ou abuso de
                                      dados pessoais.

                                                                                                               CSI Brasil | 12
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas
04 - ARQUITETURA FUNCIONAL

Dez motores do CSI Brasil

Responsabilidades por motor           Responsabilidade
                                      Ingestão contínua, conectores, uploads, filas, rate limits,
 Motor                                canonicalização e observabilidade de fontes.
 1. Listening / Data Engine
 2. Extraction Engine                 NER, entidades, valores, datas, CNPJ, contatos corporativos
 3. Enrichment Engine                 públicos, endereços, URLs, relações e tabelas.
 4. Investigation / Transform Engine
 5. Analytics Engine                  Enriquecimento em Receita/CNPJ, PNCP, CVM e demais
 6. Knowledge Graph                   fontes oficiais ou autorizadas.

                                      Transforms, pivôs recursivos, Playbooks, fan-out
                                      controlado, verificação e expansão investigativa.

                                      Sentimento, stance, tópicos, clusters, originalidade,
                                      tendências, influência, geografia e métricas.

                                      Resolução de entidades, relações, aliases, eventos,
                                      documentos, empresas, locais e proveniência.

                                                                                             CSI Brasil | 13
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Motor                       Responsabilidade
7. Evidence & Cases Engine
8. Intelligence Engine      Evidence Vault, data lineage, cobertura da coleta, casos,
9. AI Copilot               notas, colaboração, auditoria e cadeia de evidência.
10. Action Engine
                            Scores de crise, risco, oportunidade, concorrência,
                            narrativas e relevância.

                            Perguntas em linguagem natural, comparação, explicação,
                            resumo, investigação e geração de briefing com evidências.

                            Alertas, relatórios, exportações, integrações, tarefas, CRM,
                            webhooks e mobile.

                                                                                        CSI Brasil | 14
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

05 - DATA HUB BRASIL

Fontes e conectores brasileiros

O diferencial estrutural do CSI Brasil será combinar mídia e web com dados
públicos oficiais brasileiros e uploads empresariais autorizados.

Classes de fonte

Classe                         Exemplos de fonte                                        Estratégia

Imprensa e web                 Portais, jornais, agências, blogs, sites                 Crawler/licenciamento/API conforme
Social e comunidades           setoriais, RSS                                           fonte; respeitar robots, termos,
                                                                                        direitos e limites.
Governo federal                APIs/plataformas e conteúdo público
Governos estaduais/municipais  permitido                                                Integração oficial, parceiros de dados
Documentos do cliente                                                                   ou coleta
Sistemas autorizados           Receita Federal, PNCP, CVM, Portal da                    juridicamente/contratualmente
                               Transparência, dados.gov.br                              permitida.
                               Diários, transparência, licitações e
                               portais locais                                           Priorizar APIs e dados abertos oficiais.
                               PDF, DOCX, XLSX, CSV, apresentações
                               e arquivos                                               Conectores por órgão, com
                               CRM, ERP, BI, repositórios e APIs do                     classificação de confiabilidade.
                               cliente
                                                                                        Upload explícito e permissões por
                                                                                        workspace/caso.

                                                                                        Conectores autenticados, escopo
                                                                                        mínimo e trilha de auditoria.

Fontes oficiais prioritárias no MVP

 Receita Federal - CNPJ: dados cadastrais públicos de pessoas jurídicas e outras entidades
     administradas pela RFB.

 PNCP: APIs abertas para informações de compras públicas, incluindo contratos, atas e itens de
     planejamento, conforme documentação oficial.

 CVM: dados cadastrais e documentos de participantes e companhias abertas; expansão de dados
     abertos e API pública prevista no ciclo 2026-2028.

 Dados.gov.br e transparência: catálogos e fontes públicas para enriquecimento setorial e
     governamental.

Catálogo, permissões e custo por conector

Cada conector deve declarar quais entidades e Transforms disponibiliza, requisitos de autenticação,
escopo legal, limites de taxa, custo unitário, retenção permitida, campos sensíveis, SLA e restrições de
exportação. O painel administrativo deve permitir ativar/desativar conectores por workspace e
controlar orçamento de uso.

                                                                                                    CSI Brasil | 15
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Contrato de cada conector

     ConnectorDescriptor {
         id, provider, source_type, legal_basis_notes,
         auth_mode, rate_limit, allowed_fields,
         collection_method, retention_policy,
         last_success_at, health_status, parser_version

     }

  REGRA DE COLETA
  O CSI Brasil não deve assumir que todo conteúdo visível na Internet pode ser coletado em massa.
  Cada conector precisa registrar método autorizado, limites, finalidade, retenção e condições de uso.

                                                                                                                                    CSI Brasil | 16
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

06 - MONITORAMENTO

Monitores, temas, objetos e queries

Entidades principais               Descrição

 Objeto

Workspace                          Ambiente lógico do cliente/empresa.
Project                            Contexto maior: marca, concorrência, região, investigação,
                                   campanha ou mercado.
Monitor                            Consulta persistente e recorrente.
Entity                             Empresa, pessoa profissional/pública, marca, local,
                                   produto, evento, órgão, ativo ou conceito.
Query                              Expressão de busca versionada.
Source Set                         Conjunto de fontes permitido para o monitor.
Watch Rule                         Condição que transforma resultado em alerta ou ação.

Query Builder

O Query Builder deve ter dois modos simultâneos: modo técnico com operadores e modo em linguagem
natural. A IA traduz a intenção do usuário para uma AST de consulta revisável, nunca para uma string
opaca.

Usuário: "Quero acompanhar investimentos da BYD na Bahia e ignorar vagas de emprego."

AST sugerida:                                                      term:"fábrica"),
AND(

   OR(entity:"BYD", phrase:"BYD Brasil"),
   OR(location:"Bahia", location:"Camaçari", term:"investimento",
   NOT(OR(term:"vaga", term:"emprego", term:"currículo"))
)

Filtros obrigatórios

 Período e timezone
 Fonte e tipo de fonte
 Plataforma
 Autor/veículo
 Idioma
 País/UF/município
 Entidade
 Sentimento e stance
 Original/republicação/duplicata
 Relevância

                                                                                        CSI Brasil | 17
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

 Influência/alcance
 Tipo de evento
 Faixa de valor
 CNPJ/CNAE quando aplicável
 Nível de confiança
 Tag e caso

                                                                                                                                    CSI Brasil | 18
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

07 - CORE DIFERENCIAL

Extraction Studio

A extração estruturada deve ser um produto central, não um detalhe escondido
do pipeline.

O que extrair

Tipo                         Campos

Empresa                      razão social, fantasia, aliases, domínio
CNPJ                         número, máscara, validação e fonte
Pessoa profissional/pública  nome, cargo, organização
Localização                  endereço, município, UF, país, lat/lon quando derivável
                             legitimamente
Valor                        moeda, valor bruto, normalizado e contexto
Investimento                 valor, empresa, local, prazo, tipo de projeto
Contrato/licitação           número, órgão, partes, objeto, valor, vigência
Processo                     número, órgão/tribunal quando público, contexto
Contato corporativo          telefone/e-mail empresarial público e fonte
Documento                    tipo, emissor, data, versão, URL ou arquivo
Produto/serviço              nome, marca, categoria
Relação                      sujeito, predicado, objeto, evidência e confiança
URL/domínio                  canonical URL, domínio, links citados
Data e prazo                 data absoluta, período, prazo e referência temporal

Contrato de extração

     Extraction {
         field_type: "company|cnpj|person|money|location|relation|...",
         value_raw,
         value_normalized,
         entity_id?,
         source_content_id,
         evidence_span,
         extractor: "regex|parser|model|human",
         confidence: 0.00..1.00,
         verified: boolean,
         verified_by?,
         created_at

     }

                                                                                        CSI Brasil | 19
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Fluxo do usuário

1. Selecionar resultados, monitor, evento, documento ou caso.
2. Escolher schema pronto ou criar schema customizado.
3. Executar extração assíncrona em lotes.
4. Revisar campos de baixa confiança em fila de validação.
5. Resolver duplicidades e entidades equivalentes.
6. Exportar para Excel/CSV/JSON/API/CRM ou anexar a um caso.

  CRITÉRIO DE QUALIDADE
  Nenhum campo estruturado crítico deve ser apresentado sem origem e confiança. Valores obtidos de
  fontes oficiais podem ter confiança superior aos inferidos por modelo, mas a fonte e o timestamp
  sempre permanecem visíveis.

                                                                                                                                    CSI Brasil | 20
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

08 - COMPANY INTELLIGENCE

Company Intelligence e enriquecimento empresarial

Quando uma organização for detectada, o CSI Brasil tenta resolver a entidade e enriquecê-la com dados
oficiais e autorizados. A resolução deve evitar confundir marca, razão social, filial, grupo econômico ou
termo homônimo.

Ficha de empresa

Bloco                Campos

Identidade           razão social, nome fantasia, CNPJ, matriz/filial, situação,
                     data de abertura.
Atividade
Localização          CNAE principal e secundários, segmento interno CSI.
Capital e perfil
                     endereço cadastral e localidades relacionadas por eventos.
Presença digital
Mídia                capital social quando disponível, porte/classificações
Governo              públicas.

Mercado de capitais  domínios e perfis oficiais verificados.

Relações             menções, sentimento, share of voice, narrativas e eventos.

Evidências           contratos/atas/licitações encontradas em fontes públicas
                     aplicáveis.

                     dados CVM quando a entidade for regulada/companhia
                     aberta.

                     pessoas profissionais/públicas, empresas, projetos, locais,
                     documentos e eventos.

                     cada atributo com fonte, data e confiança.

Entity Resolution

     candidate_score =
         0.30 * name_similarity +
         0.20 * domain_match +
         0.15 * cnpj_match +
         0.10 * location_match +
         0.10 * industry_match +
         0.10 * relationship_context +
         0.05 * source_reliability

Pesos são ponto de partida. Devem ser calibrados por conjunto de validação brasileiro e não tratados
como regra universal.

                                                                                        CSI Brasil | 21
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas
09 - MULTIMODALIDADE

Document, Image, Audio & Video Intelligence

Document Intelligence

 Parsing nativo: PDF textual, DOCX, XLSX, CSV, HTML e apresentações.
 Fallback visual: quando o texto não estiver disponível ou estiver corrompido, usar análise

     visual/OCR com rastreabilidade por página.
 Estrutura: tabelas, cabeçalhos, anexos, assinaturas, datas, valores, partes, processos e cláusulas.
 Resultado: texto pesquisável + entidades + tabelas + embeddings + evidências por página/trecho.

Image Intelligence

 OCR e texto visível
 logos e marcas quando tecnicamente/licenciadamente permitido
 documentos fotografados
 placas e elementos visuais não sensíveis necessários ao caso
 classificação de cena e produto
 vínculo com conteúdo, evento e evidência

Audio & Video Intelligence

     VÍDEO -> EXTRAÇÃO DE ÁUDIO -> TRANSCRIÇÃO -> DIARIZAÇÃO -> TIMESTAMPS -> ENTIDADES -> TÓPICOS ->
     EVENTOS -> RESUMO -> EVIDÊNCIA

A interface deve permitir clicar em um fato e saltar para o timestamp correspondente. A transcrição
precisa preservar idioma, confiança por segmento e versão do modelo.

                                                                                                                                    CSI Brasil | 22
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

10 - INTELIGÊNCIA ANALÍTICA

Event, Narrative, Crisis & Opportunity Intelligence

Event Intelligence

Publicações semanticamente relacionadas a um mesmo acontecimento devem formar um Event Cluster.
O cluster preserva primeira ocorrência conhecida, fontes, entidades, datas, geografia, alcance,
sentimento, valores extraídos e cadeia provável de republicação.

Narrative Intelligence

Narrativas são padrões interpretativos recorrentes, diferentes de simples tópicos. Exemplo: "empresa
expandindo na Bahia", "produto com falha", "rumor de aquisição", "novo centro logístico",
"questionamento ambiental". Cada narrativa deve ter tendência, atores, evidências e confiança.

Sentimento e stance por entidade

O sistema deve classificar a tonalidade da menção em relação a cada entidade, e não apenas o texto
completo. Deve separar sentimento de posição/stance, pois um artigo pode elogiar uma empresa e
criticar outra.

Crisis Score - versão inicial

     CrisisScore = 100 * normalize(0.22*velocity + 0.20*negativity + 0.18*reach +
     0.15*source_influence + 0.15*anomaly + 0.10*recurrence)

Opportunity Score - versão inicial

     OpportunityScore = 100 * normalize(0.24*commercial_intent + 0.20*investment_signal + 0.16*fit +
     0.14*recency + 0.14*source_reliability + 0.12*actionability)

  MODELOS DE SCORE
  As fórmulas acima são especificações iniciais de produto. Devem ser configuráveis, explicáveis,
  testadas por segmento e calibradas com dados reais. O sistema deve mostrar os fatores que
  compõem cada score.

                                                                                                                                    CSI Brasil | 23
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

11 - INVESTIGAÇÃO

Knowledge Graph, Investigation Workspace e Cases

Tipos de nó   Exemplos

 Categoria

Organizações  empresa, órgão, associação, marca, grupo econômico
Pessoas
              executivos, representantes, autores, agentes públicos
Eventos       quando o dado for legitimamente público e relevante

Documentos    investimento, contrato, aquisição, crise, lançamento,
Locais        expansão
Ativos
              edital, contrato, relatório, notícia, release, apresentação
Fontes
              país, estado, município, endereço, empreendimento

              produto, domínio, projeto, imóvel/empreendimento
              quando pertinente

              veículo, portal, conta pública, órgão, dataset

Tipos de relação

 PERTENCE_A
 REPRESENTA
 CONTRATOU
 CONTRATADA_POR
 MENCIONA
 LOCALIZADO_EM
 INVESTIU_EM
 PARTICIPOU_DE
 PUBLICOU
 REPUBLICOU
 RELACIONADO_A
 CONCORRE_COM
 FORNECE_PARA
 SÓCIO/ADMINISTRADOR conforme fonte pública e finalidade legítima

Graph Workspace e Collections

O Graph Workspace deve suportar expansão por Transform, agrupamento de nós semelhantes, filtros
por tipo/confiança/fonte/data, caminhos entre entidades, detecção de hubs e abertura da evidência de
cada aresta. Para grafos grandes, Collections/Clusters devem reduzir ruído sem apagar os elementos
individuais.

                                                                                        CSI Brasil | 24
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Regra de expansão segura

Nenhum Playbook deve expandir indefinidamente. Cada execução precisa de limites de profundidade,
quantidade máxima de nós, custo, tempo, domínios permitidos e condição de parada. Expansões
envolvendo dados pessoais devem aplicar finalidade, minimização e política específica do workspace.

Investigation Workspace

Casos são espaços controlados onde analistas reúnem conteúdos, entidades, relações, documentos,
notas, hipóteses, tarefas e relatórios. Toda adição deve preservar autoria e timestamp.

Case {                                           documents[],
   id, workspace_id, title, objective, status,
   owner_id, members[], entities[], contents[],
   notes[], hypotheses[], tasks[], timeline[],
   access_policy, retention_policy, audit_log

}

                                                                                        CSI Brasil | 25
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

12 - EVIDÊNCIA

Evidence Vault e verificabilidade

Pacote mínimo de evidência  Descrição

 Campo

source_url / source_id      Origem canônica ou identificador do dataset.
published_at                Data original quando disponível.
collected_at                Data/hora de captura pelo CSI.
author/source               Autor, veículo, órgão ou sistema.
evidence_span               Trecho mínimo ou referência de página/timestamp que
                            sustenta o dado.
snapshot_ref                Referência interna ao snapshot permitido.
content_hash                Hash criptográfico do conteúdo capturado.
parser/model_version        Versão do parser ou modelo que gerou a extração.
confidence                  Confiança de extração/classificação.
human_review                Quem revisou e quando, quando aplicável.

Data Lineage e completude da coleta

Além do pacote de evidência, cada resultado derivado deve apontar o caminho de origem: entidade
inicial -> Transform/consulta -> fonte -> resultado. Sempre que a fonte oferecer contagem total ou
estimada, registrar expected_count, actual_count e coverage_ratio, exibindo aviso quando a cobertura
não for integral.

Regra de resposta da IA

O Copilot deve distinguir explicitamente três classes: (1) fato observado em fonte, (2) inferência do
sistema e (3) hipótese do analista. Uma hipótese nunca pode aparecer como fato.

  CADEIA DE CUSTÓDIA DIGITAL
  Para usos jurídicos, regulatórios ou de segurança, a plataforma pode apoiar preservação e auditoria
  de evidências, mas não deve prometer validade probatória automática. Requisitos jurídicos
  específicos devem ser definidos com assessoria especializada.

                                                                                        CSI Brasil | 26
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

13 - BUSCA

Busca, filtros e Ask Intelligence

Quatro modos                                     Objetivo

 Modo

Busca simples                                    Encontrar rapidamente termos, entidades ou documentos.
Busca avançada
                                                 Booleanos, proximidade, campos, operadores e filtros
Ask Intelligence                                 combináveis.
Pivot Search
                                                 Responder perguntas sobre a base indexada e citar
                                                 evidências internas.
                                                 Usar uma entidade ou resultado validado como novo
                                                 ponto de investigação, oferecendo Transforms e Playbooks
                                                 compatíveis com tipo, fonte e permissão.

Exemplo Ask Intelligence

Pergunta: "Quais empresas anunciaram investimentos acima de R$ 100 milhões na Bahia nos últimos
60 dias?"

Plano do sistema:                    confiança.
1. interpretar período e geografia;
2. pesquisar eventos e conteúdos;
3. extrair empresa, valor e local;
4. resolver duplicatas e entidades;
5. aplicar limiar de valor;
6. retornar tabela com evidências e

Relevância híbrida

A busca deve combinar BM25/lexical + embeddings semânticos + boosts por entidade, recência,
confiabilidade da fonte e contexto do projeto. O usuário deve conseguir ordenar por relevância, data,
impacto ou risco.

                                                                                        CSI Brasil | 27
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas
14 - ANALYTICS

Geo Intelligence e dashboards

Geo Intelligence

Mapa do Brasil com drill-down por região, UF e município. O mapa deve permitir selecionar indicador:
menções, eventos, sentimento, empresas, investimentos extraídos, contratos, crise, oportunidade ou
atividade de fonte.

Princípio do dashboard investigável

  TODO GRÁFICO É UM FILTRO
  Ao clicar em um pico, região, barra, segmento ou score, o usuário deve chegar à lista exata de
  conteúdos, eventos ou entidades que produziram aquele indicador.

Dashboards padrão

 Executive Overview
 Reputation & Media
 Competitor Intelligence
 Crisis Radar
 Opportunity Radar
 Government & Contracts
 Company Intelligence
 Regional Intelligence
 Source Quality & Coverage
 Operations / Connector Health

                                                                                                                                    CSI Brasil | 28
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

15 - AÇÃO

Alertas e Action Engine

Canais

 E-mail
 Push web/mobile
 Telegram quando autorizado
 WhatsApp Business via provedor/API oficial
 Slack/Teams quando integrado
 Webhook
 CRM/Helpdesk
 Relatório agendado

Motor de regras

     WHEN
         entity.sector == "logística"
         AND location.uf == "BA"
         AND opportunity_score >= 75
         AND source_reliability >= 0.70

     THEN
         create_alert(priority="high")
         add_to_case("Oportunidades Bahia")
         send_webhook("crm")

Controles contra fadiga de alerta

 Deduplicação por evento
 cooldown configurável
 agrupamento de alertas correlatos
 limites por canal
 prioridade e severidade
 janela de silêncio
 regras por usuário/equipe
 explicação do motivo do alerta

                                                                                                                                    CSI Brasil | 29
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas
16 - ENGENHARIA

Arquitetura técnica de referência

Stack sugerido      Tecnologia sugerida                                                 Observação
                    Next.js + React + TypeScript
 Camada             React Native                                                        SSR/SPA híbrido; design system e
 Frontend Web       NestJS ou FastAPI                                                   componentes de dados.
 Mobile
 API transacional   Python + FastAPI workers                                            Foco em alertas, feed, casos,
                    PostgreSQL                                                          aprovações e resumos.
 IA/NLP             OpenSearch
 Banco operacional  ClickHouse                                                          Escolher uma linguagem principal por
 Busca              Neo4j ou camada graph sobre                                         domínio e evitar microserviços
 Analytics          PostgreSQL inicialmente                                             prematuros.
 Grafo              Redpanda/Kafka ou SQS equivalente
 Filas/stream       Redis                                                               Modelos, embeddings, extração,
 Cache              S3 compatível                                                       clustering e avaliação.
 Objetos
                                                                                        Multi-tenant, RBAC, auditoria e
                                                                                        metadados.

                                                                                        Lexical, filtros, agregações e vetores
                                                                                        quando adequado.

                                                                                        Grandes volumes de eventos e séries
                                                                                        temporais.

                                                                                        Avaliar custo/complexidade antes de
                                                                                        separar.

                                                                                        Ingestão, eventos e backpressure.

                                                                                        Sessões, locks, rate-limit e cache.

                                                                                        Snapshots, documentos, mídia e

                                                                                        CSI Brasil | 30
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Camada           Tecnologia sugerida                                                    Observação
Orquestração     Temporal
Observabilidade  OpenTelemetry + logs/metrics/traces                                    artefatos.
                                                                                        Workflows confiáveis e
                                                                                        reprocessamento.
                                                                                        Métricas por conector, workflow e
                                                                                        agente.

Topologia inicial

Começar como modular monolith + workers assíncronos. Separar serviços somente quando volume,
isolamento de segurança ou perfil de carga justificar. Evitar uma arquitetura de dezenas de
microserviços no MVP.

                                                                                        CSI Brasil | 31
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

17 - DADOS               Função

Modelo de dados central  tenant/cliente
                         objeto de suporte ao domínio
Entidades de domínio     objeto de suporte ao domínio
                         objeto de suporte ao domínio
 Entidade                contexto de trabalho
                         consulta persistente
 Workspace               objeto de suporte ao domínio
 User                    objeto de suporte ao domínio
 Role                    objeto de suporte ao domínio
 Permission              conteúdo bruto normalizado
 Project                 objeto de suporte ao domínio
 Monitor                 objeto resolvido
 QueryVersion            objeto de suporte ao domínio
 Source                  objeto de suporte ao domínio
 Connector               aresta do grafo
 Content                 cluster de acontecimento
 Mention                 objeto de suporte ao domínio
 Entity                  objeto de suporte ao domínio
 EntityAlias             campo estruturado
 EntityIdentifier        proveniência
 Relationship            objeto de suporte ao domínio
 Event                   objeto de suporte ao domínio
 Narrative               objeto de suporte ao domínio
 Location                objeto de suporte ao domínio
 Extraction              objeto de suporte ao domínio
 Evidence                objeto de suporte ao domínio
 Document
 MediaAsset
 Metric
 Score
 AlertRule
 Alert

                                                                                        CSI Brasil | 32
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Entidade             Função

Case                 investigação controlada
CaseItem             objeto de suporte ao domínio
Note                 objeto de suporte ao domínio
Report               objeto de suporte ao domínio
ExportJob            objeto de suporte ao domínio
AuditLog             auditoria
ModelRun             execução de IA
HumanReview          objeto de suporte ao domínio
TransformDefinition  contrato versionado de investigação/conector
TransformRun         execução auditável de Transform
Playbook             workflow investigativo versionado
PlaybookRun          execução auditável de Playbook
GraphView            estado/configuração de visualização investigativa
ProvenanceEdge       linhagem entre entrada, operação, fonte e resultado
EvidencePath         caminho explicável de evidências
CoverageMetric       expected/actual/coverage por coleta

Content - campos mínimos

     Content {
         id, workspace_scope?, source_id, external_id?, canonical_url?,
         author_id?, published_at?, collected_at, language,
         title?, body_text, media_refs[], location_hints[],
         engagement_metrics{}, original_content_id?, duplicate_cluster_id?,
         source_reliability, raw_storage_ref?, content_hash,
         parser_version, visibility_policy, retention_policy

     }

Multi-tenancy

Dados públicos globais podem ser reutilizados em uma camada compartilhada com isolamento lógico de
resultados privados. Uploads, notas, casos, integrações e dados licenciados específicos permanecem
estritamente isolados por workspace e política.

                                                                                        CSI Brasil | 33
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

18 - INTEGRAÇÃO

APIs, eventos e contratos

REST/GraphQL

 API pública versionada /v1
 OpenAPI obrigatório
 pagination cursor-based
 idempotency-key para writes sensíveis
 filtros por campo padronizados
 RBAC/ABAC aplicado no gateway e serviço
 audit_id retornado em operações críticas

Eventos de domínio

content.collected
content.normalized
content.deduplicated
extraction.completed
entity.resolved
event.detected
score.updated
alert.triggered
case.item_added
report.generated
transform.started
transform.completed
transform.failed
playbook.started
playbook.completed
relationship.created
evidence.linked
coverage.updated

Webhook

Assinatura HMAC, retries exponenciais, dead-letter, replay manual e idempotência. Não enviar dados
além do necessário para o destino configurado.

                                                                                                                                    CSI Brasil | 34
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas
19 - IA MULTIAGENTE

Camada multiagente do CSI Brasil

Regra estrutural

Agentes não devem ser personas genéricas com acesso total. Cada agente tem objetivo, ferramentas
mínimas, schema de entrada e saída, limites, budget, timeout, política de retry e métricas de qualidade.

Agente        Responsabilidade                                                          Ferramentas mínimas

Supervisor    Decompor tarefa e coordenar agentes.                                      planner, task state, policy evaluator
Research      Descobrir conteúdos relevantes.                                           search index, approved connectors
Extraction    Extrair campos estruturados.                                              content read, extraction models
Verification  Confirmar evidências e inconsistências.                                   source/evidence read, cross-check
Company       Resolver/enriquecer empresas.                                             CNPJ source, entity resolver
Government    Consultar fontes oficiais.                                                PNCP/CVM/official data connectors
Document      Analisar documentos.                                                      document parser, table extractor
Graph         Resolver relações e aliases.                                              entity/relationship store
Risk          Calcular/expor risco.                                                     analytics, scoring
Opportunity   Detectar sinais comerciais.                                               analytics, enrichment
Report        Produzir briefings.                                                       case/evidence read, report templates
Compliance    Aplicar políticas de dados.                                               policy engine, audit read

                                                                                                             CSI Brasil | 35
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Agente         Responsabilidade                                                         Ferramentas mínimas
QA
Investigation  Testar respostas e contratos.                                            fixtures, eval harness
               Executar Playbooks autorizados e                                         transform registry, playbook runner,
Evidence       controlar expansão.                                                      graph read/write controlado
               Validar proveniência, cobertura e                                        evidence vault, provenance read,
               vínculos de evidência.                                                   coverage metrics

Contrato de saída

     AgentResult<T> {
         status: "ok|partial|blocked|error",
         data: T,
         evidence_refs: string[],
         confidence: number,
         assumptions: string[],
         policy_flags: string[],
         next_actions: string[],
         trace_id: string

     }

                                                                                        CSI Brasil | 36
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

20 - SEGURANÇA E LGPD

Segurança, LGPD e governança

Privacidade by design

 Finalidade e base legal: registrar por tratamento/conector, não apenas em documento jurídico
     externo.

 Minimização: coletar e expor somente campos necessários ao caso de uso.
 Retenção: políticas configuráveis e eliminação programada.
 Direitos do titular: fluxos de acesso, oposição, correção e eliminação quando aplicáveis.
 Legítimo interesse: quando usado, exigir avaliação documentada de finalidade, necessidade,

     balanceamento, salvaguardas e legítima expectativa.
 Dados sensíveis: não presumir legítimo interesse como base; aplicar tratamento jurídico específico

     e minimização estrita.

Segurança

Controle                                          Requisito

Autenticação                                      SSO/OIDC, MFA opcional/obrigatório por plano, sessões e
Autorização                                       revogação.
Criptografia
Segredos                                          RBAC + ABAC para casos, fontes, exports e ferramentas de
Auditoria                                         agente.
Supply chain
Uploads                                           TLS em trânsito; criptografia em repouso; gestão de
IA                                                chaves.
Exports
                                                  Vault/secret manager; nunca em prompt, log ou
                                                  repositório.

                                                  logs imutáveis ou com proteção contra adulteração para
                                                  operações críticas.

                                                  SCA, dependabot equivalente, SBOM e assinatura de builds
                                                  quando viável.

                                                  antimalware, validação MIME, quotas e sandbox de
                                                  parsing.

                                                  prompt injection defenses, tool allowlists, redaction de
                                                  segredos, output validation.

                                                  watermark opcional, classificação, autorização e log.

Fronteiras proibidas

 Bypass de login, paywall ou controle de acesso
 coleta de contas privadas sem autorização
 credenciais vazadas/roubadas
 localização clandestina de indivíduos

                                                                                        CSI Brasil | 37
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

 inferência de atributos pessoais sensíveis sem base apropriada
 dossiês pessoais indiscriminados sem finalidade legítima
 exploração de vulnerabilidades ou intrusão
 contorno de termos/API por engenharia evasiva

                                                                                                                                    CSI Brasil | 38
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

21 - EXPERIÊNCIA         Função

UX, telas e navegação    Resumo executivo, mudanças, crises, oportunidades e
                         tarefas.
Navegação principal      Fluxo de conteúdos e eventos em tempo quase real.
                         Configuração de temas/queries e cobertura.
 Menu                    Busca simples/avançada/Ask Intelligence.
 Intelligence Home       Clusters e timeline de acontecimentos.
                         Company Intelligence e enriquecimento.
 Live Feed               Pessoas profissionais/públicas, marcas, órgãos, locais e
 Monitores               produtos.
 Busca                   Biblioteca, parsing, extrações e evidências.
 Eventos                 Extração em lote e schemas.
 Empresas                Relações e exploração visual.
 Entidades               Geo Intelligence.
                         Fila priorizada por score e explicação.
 Documentos              Sinais comerciais e estratégicos.
 Extraction Studio       Investigações e dossiês controlados.
 Graph                   Análises configuráveis e drill-down.
 Mapa                    Templates e geração.
 Crises                  Regras, canais, histórico e saúde.
 Oportunidades           APIs, conectores, webhooks e credenciais.
 Casos                   Usuários, permissões, políticas, auditoria e billing.
 Dashboards              Workspace para pivôs, expansão, paths e execução
 Relatórios              controlada de investigação.
 Alertas                 Catálogo e execução de Transforms/Playbooks conforme
 Integrações             entidade, custo e permissão.
 Admin                   Data lineage, snapshots, hashes, cobertura e validação das
 Investigation           evidências.

 Transforms & Playbooks

 Evidence

                                                                                        CSI Brasil | 39
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

A navegação desktop deve reservar áreas de primeira classe para Investigation, Graph,
Transforms/Playbooks, Cases e Evidence. O usuário deve poder sair de uma menção, abrir a entidade
correspondente, executar um Transform e voltar ao caso sem perder contexto.

Mobile

O app móvel não precisa reproduzir o desktop. Priorizar alertas, feed, resumo, busca rápida, favoritos,
casos, aprovação/compartilhamento e push. Configurações avançadas e graph investigation
permanecem no web.

22 - ENTREGA

Roadmap, backlog e critérios de aceite

Fases                             Escopo                                                Saída

 Fase

0 - Fundação                      PRD, arquitetura, threat model, LGPD,                 Base governada.
1 - Core                          design system, CI/CD
2 - Data MVP                                                                            Produto navegável.
3 - Intelligence MVP              Auth, workspace, projetos, monitores,
4 - Brazil Data Hub               users/RBAC                                            Primeiro monitoramento útil.
5 - Events & Analytics
6 - Extraction Studio             Web/news + uploads + fila +                           Dados estruturados.
                                  normalização + busca
7 - Investigation, Cases & Graph                                                        Enriquecimento oficial.
                                  NER, entidades, extração, sentimento,                 Inteligência acionável.
                                  dedup
                                                                                        Diferencial comercial forte.
                                  CNPJ + PNCP + CVM prioritários
                                                                                        Investigação corporativa
                                  clusters, dashboards, geografia, scores               auditável.
                                  iniciais

                                  schemas, lotes, revisão, export

                                  Transform Registry, Playbooks,
                                  cases, relações, graph v1,
                                  Evidence Vault e Data Lineage

8 - Copilot & Agents              Ask Intelligence, multiagentes, evals                 IA operacional.
9 - Multimodal                    imagem, áudio, vídeo, OCR avançado                    Cobertura ampliada.
10 - Mobile & Enterprise          app, SSO, auditoria avançada, SLA                     Enterprise.

MVP vendável - não incluir tudo

 Workspace/RBAC
 Projetos e Monitores
 Web/news + uploads
 Busca e filtros

                                                                                                             CSI Brasil | 40
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

 Deduplicação
 Entity Extraction
 Company Intelligence/CNPJ
 PNCP básico
 Sentimento por entidade
 Event clustering inicial
 Extraction Studio
 Dashboard e alertas
 Exportação
 Copilot com evidências

Fase de Investigation Engine

 Transform Registry com versionamento, permissões, custo e evidência.
 Playbooks iniciais: Investigar Empresa, Investigar Evento e Verificar Alegação.
 Graph Workspace com expansão, filtros, paths e Collections.
 Case Workspace com grafos, evidências, notas, tarefas e trilha de auditoria.
 Data Lineage obrigatório e indicador de cobertura de coleta.
 Connector SDK/manifest para fontes internas e parceiros.

Definition of Done global

 Código versionado e revisado
 testes unitários e integração
 telemetria mínima
 tratamento de erro e retry
 documentação OpenAPI quando API
 RBAC aplicado
 audit log quando operação sensível
 evidências preservadas
 sem segredos no código
 critério de acessibilidade web básico
 rollback ou feature flag para mudança de risco

                                                                                                                                    CSI Brasil | 41
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

23 - NEGÓCIO

Modelo comercial e métricas de produto

Estrutura de planos - sugestão

Plano                        Perfil                                                     Limites / diferenciais

Starter                      PMEs/agências pequenas                                     Poucos monitores, retenção menor,
Professional                 PR/marketing/inteligência                                  web/news, dashboards básicos.
Enterprise                   Grandes empresas/governo
                                                                                        Mais fontes, Extraction Studio, alertas
Data/API                     Plataformas e integradores                                 avançados, integrações.

                                                                                        SSO, SLA, retention custom, cases,
                                                                                        graph, audit, private connectors,
                                                                                        support.

                                                                                        Cobrança por volume de chamadas,
                                                                                        eventos, entidades e exportações.

Métricas norteadoras                 Por que importa

 Métrica                             Tempo até o usuário encontrar algo acionável.
                                     Qualidade dos resultados prioritários.
 Time-to-first-insight               Confiabilidade dos campos estruturados.
 Precision@K                         Evita duplicidades e relações erradas.
 Extraction accuracy                 Reduz fadiga e aumenta confiança.
 Entity resolution accuracy          Percentual de insights com evidência rastreável.
 Alert precision                     Uso real do produto.
 Evidence coverage                   Monitores que geram alertas/casos/exports úteis.
 Weekly active analysts              Sustentabilidade comercial.
 Monitors producing actions          Eficiência de infraestrutura e IA.
 Retention / churn
 Cost per 1k contents

                                                                                                                CSI Brasil | 42
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

24 - EXECUÇÃO COM CLAUDE

Contrato de execução para Claude

Esta seção deve ser usada como instrução operacional para desenvolvimento
autônomo e incremental.

Papel do Claude

Atue como arquiteto principal, product engineer e QA técnico do CSI Brasil. Seu objetivo é entregar
incrementos funcionais completos, não apenas sugerir código. Tome decisões reversíveis
autonomamente; documente decisões irreversíveis ou de alto impacto. Não interrompa o trabalho
pedindo confirmação para escolhas técnicas normais quando este book já oferece direção suficiente.

Regras de autonomia

 Antes de codificar, ler a estrutura existente e identificar padrões já adotados.
 Não reescrever módulos estáveis sem necessidade demonstrável.
 Implementar em fatias verticais testáveis: UI + API + dados + autorização + observabilidade.
 Criar migrações idempotentes e reversíveis.
 Não introduzir dependência sem justificar necessidade, licença e impacto.
 Não armazenar segredos no repositório.
 Não desabilitar testes para fazer pipeline passar.
 Não mockar permanentemente integração que faz parte do critério de aceite.
 Em tarefas grandes, produzir checklist interno e seguir até o critério de aceite.
 Se um requisito for impossível ou inseguro, implementar alternativa segura e registrar a limitação.

Regras específicas do Investigation Engine

 Implementar Transforms como contratos versionados, idempotentes quando possível e com saída
     estruturada.

 Nunca permitir que um Transform grave fato incerto diretamente na entidade canônica sem política
     de resolução/confiança.

 Toda aresta do grafo precisa de evidence_ids e provenance_path.
 Playbooks devem possuir limites explícitos de profundidade, nós, tempo, custo e condição de parada.
 Ao integrar fonte externa, registrar licença/termos, autenticação, rate limit, cache, retenção e

     campos permitidos.
 Distinguir coleta incompleta de ausência de resultado; preservar expected_count/actual_count

     quando disponível.
 Projetar o Graph como interface investigativa sobre dados auditáveis, nunca como geração visual

     desconectada da evidência.

Ordem de decisão

1. Segurança e legalidade
2. Integridade de evidência e auditabilidade
3. Correção funcional

                                                                                                                                    CSI Brasil | 43
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

4. Experiência do usuário
5. Escalabilidade necessária agora
6. Custo
7. Velocidade de entrega
8. Otimizações futuras

Entrega de cada tarefa

     Ao concluir uma tarefa, entregue:
     1. Resumo do que mudou.
     2. Arquivos criados/alterados.
     3. Migrações e variáveis de ambiente.
     4. Testes executados e resultado.
     5. Riscos/limitações remanescentes.
     6. Critério de aceite validado.
     7. Próxima tarefa lógica do roadmap.

                                                                                                                                    CSI Brasil | 44
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas
25 - PROMPT CENTRAL

                                                                                                                                    CSI Brasil | 45
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Master Prompt para Claude - CSI Brasil

                                                                                                                                    CSI Brasil | 46
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

PROJETO: CSI Brasil
OBJETIVO: construir uma plataforma brasileira de inteligência corporativa, mídia e fontes abertas, baseada em
arquitetura própria e inspirada apenas em padrões funcionais públicos de plataformas de monitoramento e OSINT
corporativo.

PRINCÍPIO CENTRAL
Descobrir -> Identificar -> Extrair -> Enriquecer -> Relacionar -> Verificar -> Analisar -> Alertar -> Decidir.

REGRAS INEGOCIÁVEIS
- Evidence-first: toda afirmação relevante deve preservar evidência e proveniência.
- Entity-first: estruturar a inteligência em entidades, eventos e relações, não apenas documentos.
- Privacy by design: finalidade, minimização, retenção, acesso e base legal entram no modelo.
- Não fazer bypass de autenticação, paywall, API, termos ou controles de acesso.
- Não usar credenciais roubadas, dados privados sem autorização ou mecanismos de intrusão.
- Não copiar código, identidade visual ou ativos proprietários do Kribrum ou de qualquer concorrente.
- Agentes devem operar com least privilege e saídas estruturadas.
- Toda operação sensível deve gerar audit log.
- Não pedir confirmação para decisões técnicas reversíveis já orientadas por este book.

ARQUITETURA FUNCIONAL         Engine
1. Listening/Data Engine
2. Extraction Engine
3. Enrichment Engine
4. Investigation / Transform
5. Analytics Engine
6. Knowledge Graph
7. Evidence & Cases Engine
8. Intelligence Engine
9. AI Copilot
10. Action Engine

MVP PRIORITÁRIO
Workspace/RBAC, Projects, Monitors, Web/News + uploads, search, deduplication, Entity Extraction, Company
Intelligence/CNPJ, PNCP, sentiment by entity, event clustering, Extraction Studio, dashboards, alerts, exports e
Copilot com evidências. Preparar desde o início os contratos para Transform Registry, provenance e Case/Evidence,
mesmo quando a interface investigativa completa entrar em fase posterior.

INVESTIGATION ENGINE
- Transform é contrato versionado: input types, output types, provider, legal scope, auth, rate limit, cost,
cache, confidence e evidence policy.
- Playbooks combinam Transforms com limites de profundidade, quantidade de nós, tempo, custo e condição de parada.
- Toda aresta do grafo deve possuir evidence_ids e provenance_path.
- Distinguir ausência de resultado de coleta parcial; registrar expected_count, actual_count e coverage_ratio
quando a fonte permitir.
- Nenhum Transform deve contornar autenticação, termos, paywall ou controles de acesso.

STACK DE REFERÊNCIA
Next.js/React/TypeScript; PostgreSQL; OpenSearch; ClickHouse quando volume justificar; Python/FastAPI para IA;
Redis; storage S3; filas; OpenTelemetry; modular monolith + workers inicialmente.

MODO DE TRABALHO                                       permissão  desnecessária.
1. Audite o repositório e a arquitetura existente.
2. Mapeie o requisito atual para uma fatia vertical.
3. Crie/atualize schema e migrations.
4. Implemente backend e validações.
5. Implemente UI mínima completa.
6. Aplique RBAC/ABAC.
7. Adicione logs, métricas e tratamento de erro.
8. Escreva testes.
9. Execute testes e lint/build.
10. Valide os critérios de aceite.
11. Documente a mudança.
12. Avance para a próxima tarefa lógica sem solicitar

PADRÃO DE DADOS
Toda extração deve conter: field_type, value_raw, value_normalized, source_content_id, evidence_span,
extractor/model version, confidence, verified, timestamps.
Toda conclusão de agente deve conter: status, data, evidence_refs, confidence, assumptions, policy_flags,
next_actions, trace_id.

POLÍTICA DE FONTES
Cada ConnectorDescriptor deve registrar provider, source_type, auth_mode, rate_limit, allowed_fields,
collection_method, legal/compliance notes, retention, parser version e health status.

QUALIDADE
Não considerar concluído enquanto não houver teste, autorização, evidência, auditabilidade e tratamento de erro
compatíveis com o risco do módulo.

RESULTADO ESPERADO
Um produto utilizável, modular, documentado, observável e seguro, preparado para evoluir para multimodalidade,
graph intelligence avançado, mobile e enterprise.

                                                                                                       CSI Brasil | 47
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Primeiro comando recomendado ao Claude

     Leia integralmente o Book CSI Brasil. Em seguida, audite o repositório atual e produza um "Gap
     Map" entre o estado existente e o MVP definido no book. Não altere código antes de concluir o
     Gap Map. Depois, implemente a primeira fatia vertical faltante de maior valor, incluindo banco,
     API, UI, autorização, testes e documentação. Continue autonomamente enquanto os requisitos
     estiverem claros e reversíveis.

                                                                                                                                    CSI Brasil | 48
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

ANEXO A

Estratégia de integração do awave-agents

Aplicar somente após auditoria real do repositório.

Objetivo da auditoria

Determinar se o awave-agents pode acelerar a camada multiagente e o processo de desenvolvimento do
CSI Brasil sem criar dependência excessiva, risco de segurança ou incompatibilidade de licenças.

Matriz de decisão

Critério                 Peso                                                           Pergunta de auditoria

Arquitetura multiagente  15                                                             Há supervisor, handoff, task state e
                                                                                        contratos de saída?
Compatibilidade Claude   10
                                                                                        Prompts/tools/context funcionam bem
Orquestração             10                                                             com Claude e MCP/integrações?

Ferramentas              10                                                             Suporta DAG/workflows, retry, timeout e
                                                                                        estado?
Memória/contexto         8
                                                                                        Há allowlists, schemas e isolamento por
Pesquisa/OSINT           10                                                             agente?

Extração                 10                                                             Contexto é controlado, versionado e não
                                                                                        vaza entre tenants?
Segurança                8
                                                                                        Há mecanismos reaproveitáveis sem
Observabilidade          5                                                              violar fontes/termos?

Testes/QA                5                                                              Saídas estruturadas e validação de
                                                                                        schema?
Escalabilidade           5
                                                                                        Least privilege, secrets, sandbox e
Documentação/licença     4                                                              injection defenses?

                                                                                        Trace, logs, token/cost, erros e métricas?

                                                                                        Evals, fixtures e testes determinísticos?

                                                                                        Workers/queues e limites configuráveis?

                                                                                        README, exemplos, licença e
                                                                                        dependências claras?

Classificação por componente   Critério

 Decisão                       Entra praticamente como está; possui testes, licença
 REUTILIZAR                    adequada e encaixa nos contratos CSI.

                                                                                                               CSI Brasil | 49
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

Decisão     Critério
ADAPTAR
SUBSTITUIR  Base útil, mas precisa adequar schemas, segurança, multi-
CRIAR       tenancy ou observabilidade.

            Resolve parcialmente, porém cria risco/complexidade
            maior do que reconstruir.

            Capacidade inexistente ou incompatível com os requisitos
            CSI.

Integração alvo

Se aprovado, o awave-agents pode ocupar a camada de coordenação de agentes e eventualmente
orquestrar Playbooks, mas não deve substituir o Transform Registry, o Data Engine, o Evidence Vault
nem o banco central. Dados oficiais, entidades, relações, evidências, scores e políticas continuam
pertencendo ao core CSI Brasil. Cada ação do agente sobre o Investigation Engine deve usar contratos
tipados e auditáveis.

                                                                                        CSI Brasil | 50
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas
ANEXO B

Glossário técnico

Termo              Definição
ABAC
                   Attribute-Based Access Control. Autorização baseada em
BM25               atributos.
Canonical URL      Algoritmo clássico de relevância para busca textual.
Crisis Score       URL definida como referência principal para um conteúdo.
Entity Resolution  Score explicável de risco/crise.
                   Processo de decidir se menções diferentes representam a
Evidence           mesma entidade.
                   Referência verificável que sustenta uma extração ou
Knowledge Graph    conclusão.
NER                Grafo de entidades e relações com proveniência.
                   Named Entity Recognition - identificação de entidades no
OSINT              texto.
                   Open Source Intelligence - inteligência produzida a partir
RBAC               de fontes abertas, dentro de finalidade e acesso legítimos.
Stance             Role-Based Access Control. Autorização baseada em papéis.
Workspace          Posição de um conteúdo em relação a uma entidade/tema.
                   Tenant/ambiente do cliente dentro do CSI Brasil.

Referências públicas usadas na concepção

Kribrum.Pro - página do produto: https://kribrum.ru/pro/
Kribrum - visão de produtos e capacidades: https://kribrum.ru/
Kribrum.Pro - estatísticas avançadas: https://kribrum.ru/events/kribrum-pro-prodvinutaya-statistika
Kribrum.Pro - tonalidade por menção: https://kribrum.ru/events/kak-kribrum-pro-opredelyaet-
tonalnost
Kribrum.Pro - mapa interativo: https://kribrum.ru/events/kribrum-pro-zhivaya-karta
Kribrum.OSINT - página pública do projeto: https://kribrum.ru/osint/
Receita Federal - Dados Abertos: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-
abertos
Receita Federal - Cadastros/CNPJ: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-
abertos/cadastros
PNCP - Dados Abertos: https://www.gov.br/pncp/pt-br/acesso-a-informacao/dados-abertos

                                                                                        CSI Brasil | 51
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas

CVM - Dados Abertos: https://www.gov.br/cvm/pt-br/acesso-a-informacao-cvm/dados-abertos/portal-
dados-abertos
CVM - Plano de Dados Abertos 2026-2028: https://www.gov.br/cvm/pt-br/assuntos/noticias/2026/cvm-
publica-plano-de-dados-abertos-2026-2028
ANPD - Guia de Legítimo Interesse: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-
educativos-e-publicacoes/
guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse
Buzzmonitor - Social Listening: https://buzzmonitor.com/social-listening/
Zeeng - Benchmarking: https://zeeng.com.br/zeeng-benchmarking/
Cortex - Reputação nas Mídias: https://www.cortex-intelligence.com/brand/reputacao-nas-midias
Maltego - visão de produtos e planos:
https://docs.maltego.com/en/support/solutions/articles/15000036759-maltego-products-and-plans
Maltego Graph - Community Edition e recursos de link analysis/importação/exportação:
https://docs.maltego.com/en/support/solutions/articles/15000018947-what-is-maltego-graph-community-
edition-ce-
Maltego Data - Data Pass e Connectors:
https://docs.maltego.com/en/support/solutions/articles/15000058711-data-pass-and-connectors-for-
maltego-graph
Maltego Machines SDK - workflows reutilizáveis:
https://docs.maltego.com/en/support/solutions/articles/15000062348-machines-sdk-
Maltego Transforms SDK - referência de API:
https://docs.maltego.com/en/support/solutions/articles/15000062354-sdk-api-reference
Maltego Standard Entities - catálogo de entidades:
https://docs.maltego.com/en/support/solutions/articles/15000062357-standard-entities-overview
As referências servem para benchmark funcional, dados oficiais, contexto de mercado e governança. O
CSI Brasil deve manter implementação independente e revisar periodicamente termos, APIs, licenças,
políticas de retenção e legislação aplicável.

                                                                                                                                    CSI Brasil | 52
CSI BRASIL | Plataforma Brasileira de Inteligência Corporativa, Mídia e Fontes Abertas
ENCERRAMENTO

Direção final do projeto CSI Brasil

O CSI Brasil deve começar menor que a visão final, mas com fundações que não precisem ser
descartadas. O MVP precisa provar monitoramento útil, extração estruturada com evidência e
enriquecimento brasileiro. Em seguida, o Investigation Engine adiciona Transforms, Playbooks, Graph
Workspace, Data Lineage e Cases; a camada de inteligência aplica scores, narrativas e Copilot sobre esse
conjunto verificável. Multimodalidade e mobile entram quando o core já estiver confiável.

  NORTE DO PRODUTO
  O melhor resultado do CSI Brasil não é "encontrar mais dados". É transformar dados legítimos e
  verificáveis em inteligência acionável, com contexto, relacionamento, explicação e rastreabilidade.

Próxima ação recomendada

1. Entregar este book ao Claude.
2. Executar auditoria do repositório atual e do awave-agents, verificando se pode orquestrar
agentes/Playbooks sem assumir responsabilidades do core.
3. Gerar Gap Map do MVP.
4. Implementar a primeira fatia vertical: Workspace -> Monitor -> Coleta Web/News -> Busca -> Extração
-> Evidência -> Dashboard.
5. Adicionar CNPJ/PNCP, Company Intelligence e o Transform Registry inicial.
6. Implementar os Playbooks iniciais e iniciar avaliação quantitativa de precisão, cobertura e qualidade
das relações antes de expandir fontes e agentes.

                                                                                                                                    CSI Brasil | 53
