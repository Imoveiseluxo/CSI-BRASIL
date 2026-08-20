# Relatório de Atividades — CSI Brasil

Log de tudo que foi feito no projeto, sessão por sessão. **Mais recente no topo.**

Regra: toda mudança entra aqui, e o relatório é atualizado **durante** a sessão, não só no
fim. Vale desde o primeiro commit.

---

## 20/08/2026, 08h20 — filtros de período e de fonte, e a regra de nunca mentir por omissão

Último item que faltava da busca. Agora dá para estreitar por **data** (7, 30, 90 dias ou
qualquer data) e por **fonte**. Os dois ficam na URL junto com o termo, então o link continua
podendo ser guardado ou mandado para alguém.

### O que foi medido, contra o banco de produção

Quatro perguntas, e cada uma com uma resposta que **separa as hipóteses** — resultado que
poderia ter duas explicações não prova nada:

```
1. período
   sem filtro nenhum                     -> 4
   últimos 30 dias (coletado ontem)      -> 4      corta o que é velho…
   só o que for de 2027 em diante        -> 0      …e mantém o que está dentro

2. fonte
   só a fonte "Minha Receita"            -> 4
   só a fonte "E-mail encaminhado"       -> 0

3. empresa SEM evidência consegue existir?
   inserir empresa sem evidência         -> RECUSADO pelo banco (erro 23502)

4. os filtros furam o isolamento entre clientes?
   organização própria, sem filtro       -> 4
   id de OUTRA organização no parâmetro  -> []
   fonte de outra organização no filtro  -> []
```

**A pergunta 3 rendeu a descoberta da tarefa**, e ela é boa: `companies.evidence_id` é
obrigatório no banco. **Nenhuma empresa pode existir sem apontar para a evidência que a
sustenta** — isso é estrutura, não regra escrita em algum lugar que alguém possa esquecer de
aplicar. É exatamente o que o book cobra, e estava garantido sem que eu soubesse.

**Correção de algo que eu tinha escrito errado:** na migration eu havia comentado que o
`coalesce` com a data de produção existia porque *"empresa sem evidência sumiria do filtro"*.
**Esse caso não existe** — o banco o proíbe. Reescrevi o comentário dizendo a verdade: o
`coalesce` fica como rede para o dia em que essa obrigatoriedade for afrouxada. Comentário que
descreve um sistema que não é o real já custou uma migration quebrada neste projeto (a `0006`,
em 19/08).

### A regra que governa os dois filtros

⚠️ **Filtro inválido vira "sem filtro", nunca "filtro impossível".** O que chega pela URL é
hostil — qualquer um digita o que quiser lá. Um período inventado ou uma fonte que não é um id
**caem para o padrão** em vez de irem para o banco. Filtrar por lixo devolveria zero
resultados, e zero resultados é indistinguível de *"não existe nada"*: a busca passaria a
mentir por omissão, sem erro nenhum na tela.

⚠️ **Resultado vazio com filtro ligado diz isso na tela**, e oferece o link para buscar sem
filtro. Pelo mesmo motivo: *"Nada encontrado"* com um filtro escondido parece ausência de dado
quando é só recorte.

### O que ficou aberto

Nada da busca. Ela agora acha, ordena, mostra onde casou, filtra, e não mente quando o
recorte esconde coisa.

**Verificação:** 86 testes verdes (8 novos), `tsc` sem erro, build completa, medição contra o
banco de produção acima.

**Nota do que apareceu de madrugada:** o dono consultou a **BAHIA REALTY LTDA** às 02h09 —
segunda empresa no banco, coletada e gravada com procedência, sem intervenção minha.

---

## 20/08/2026, 00h50 — a busca passou a ordenar pelo que mais casa, e a mostrar onde casou

Antes, os resultados vinham na ordem que o banco quis, e sem contexto: aparecia o nome da
empresa, mas não **por que** ela veio. Com uma empresa só isso não incomoda; com quinhentas, a
busca deixa de servir.

Agora a busca:

- **ordena por relevância** — o que mais casa com o termo vem primeiro;
- **mostra o trecho que casou**, com a palavra destacada.

### O que foi medido

Contra o banco de produção, com a empresa que o dono cadastrou:

```
buscar('realty camacari')
  0.091490  empresa     [REALTY] CONSULTORIA IMOBILIARIA LTDA [CAMACARI]
  0.015901  evidencia   (sem trecho)
  ordem decrescente de relevância?  SIM
  veio com marcação de trecho?      SIM
  evidência SEM trecho (proposital)? SIM
```

E a pergunta que importa mais que a ordenação — **a busca respeita o isolamento entre
clientes?** Montei uma segunda organização com uma empresa dela e busquei com a sessão do
dono, **passando o id da outra organização no próprio parâmetro da função**:

```
mesmo termo, organização própria  -> 2 resultados
mesmo termo, organização alheia   -> []   (e o superusuário confirma: a linha existia lá)
```

Barrado pela regra de segurança do banco, **não pela tela**. Organização de teste apagada em
seguida; restou 1.

### Três decisões que valem estar escritas

⚠️ **A função de busca no banco é `security invoker`, e nunca pode virar `definer`.** Como
`definer`, ela rodaria com os poderes de quem a criou e devolveria resultado de **qualquer**
organização. Busca é justamente onde um vazamento passa despercebido — o resultado parece
legítimo. Está escrito no código e no mapa para ninguém "otimizar" isso depois.

⚠️ **O destaque não usa HTML.** O jeito comum é pedir `<b>` ao banco e injetar na tela — mas
esse texto deriva de dado de fonte externa, e injetar HTML de fora é XSS. Marquei com
caracteres de controle e quebro em pedaços no código; o texto continua texto.

⚠️ **Evidência não ganhou trecho destacado, de propósito.** O artefato cru pode conter dado
pessoal, e um trecho na lista de resultados vazaria isso sem ninguém ter escolhido abrir nada.

### Dois erros meus nesta tarefa, corrigidos em voz alta

1. **Apliquei a migration e só depois troquei os marcadores** — o banco continuou devolvendo
   os antigos (`«»`). Ia para o ar mostrando `«REALTY»` como texto literal na tela. Só apareceu
   porque eu medi contra o banco em vez de confiar no teste verde. Reapliquei e remedi.

2. **Meu primeiro teste de isolamento não provava nada.** Ele buscava um termo na organização
   do dono e **outro** termo na alheia; as duas voltaram `[]` — uma por segurança, a outra
   simplesmente porque o termo não existia. Refiz com o **mesmo termo** nos dois lados, que é
   o que separa as duas explicações.

### O que ficou aberto

- A busca ainda **não filtra por período nem por fonte**. Com um punhado de registros não faz
  falta; vai fazer.
Nada mais. **E um susto que eu mesmo criei e desfiz:** ao ver que o banco tinha uma empresa
só, cheguei a escrever na lista de pendências que a Petrobras podia ter sumido. Medi antes de
levar isso ao dono, e a medição derrubou: a tabela de evidências guarda a coleta do e-mail de
teste das 23h16 e a do CNPJ dele das 23h53 — se alguém tivesse apagado registros, **a mais
antiga teria ido junto**. Ela está lá. Logo a Petrobras nunca foi gravada: `33.000.167/0001-01`
é o exemplo escrito na tela vazia, e ele já tinha dito *"usei meu cnpj mesmo"*. Pendência
aberta e fechada na mesma medição.

**Verificação:** 78 testes verdes (6 novos), `tsc` sem erro, build completa. O teste do trecho
foi quebrado de propósito antes de encerrar — e ficou vermelho pelo motivo certo: o texto
`QUIMICA DO NORDESTE` sumia da tela sem erro nenhum.

---

## 20/08/2026, 00h35 — a tela de evidência: procedência que dá para conferir

Até agora a ficha da empresa **dizia** "veio da fonte X, com este hash" — e ninguém conseguia
verificar. **Procedência que não pode ser aberta é afirmação, não evidência.**

`/app/[orgSlug]/evidencia/[id]` mostra, de uma vez: a fonte, quando foi coletado, por quem, a
impressão digital completa, **o que foi derivado daquilo**, e o **artefato cru** como a fonte
respondeu.

**O caminho até ela é o próprio hash.** Na ficha da empresa, o hash virou link — quem duvida
do dado clica e vê o original.

### Três decisões que valem estar escritas

⚠️ **Mostra o artefato CRU, e isso é deliberado.** Evidência que só pode ser vista depois de
interpretada não é evidência — é o resumo de alguém. O book pede cadeia de evidência, e cadeia
que ninguém consegue inspecionar não prova nada.

⚠️ **Consequência assumida:** artefato cru pode conter dado pessoal — e-mail de contato,
sócio de MEI. Por isso a **lista de busca não mostra conteúdo**; só esta tela, onde a pessoa
escolheu abrir um artefato específico e pertence à organização.

⚠️ **404, e não "sem permissão".** Dizer *"existe, mas não é sua"* confirmaria a existência de
um id de outra organização — que é informação, e informação que não é nossa para dar.

### A prova

Montei uma **segunda organização** com uma evidência dela, e tentei lê-la com a sessão do
dono:

```
dono tentando ler a evidência alheia -> []
evidências próprias visíveis         -> 2
```

**Barrado pela RLS**, não pela tela — a tela só transforma "não achei" em 404. Organização de
teste apagada em seguida; restou uma, a do dono.

⚠️ Um detalhe de estilo que é decisão: o artefato usa `overflow: auto`, **não** quebra de
linha. JSON quebrado no meio deixa de ser copiável e conferível — que é a razão de a tela
existir.

**Verificação:** **72 testes verdes** · `tsc` 0 erros · publicado e provado contra o banco.

---

## 20/08/2026, 00h25 — busca, e um defeito que só apareceu porque desconfiei do próprio acerto

A busca é o que faz o dado coletado servir para alguma coisa — e é o que torna o e-mail útil
quando o Cloudflare entrar, já que o dono definiu e-mail como **fonte de busca**.

### Como foi feita

Busca textual nativa do Postgres, sem OpenSearch — coerente com a decisão de
**PostgreSQL + pgvector**. Sobre **empresas** e sobre **evidências**.

⚠️ **Coluna gerada, não gatilho.** Coluna gerada é mantida pelo próprio banco e não pode sair
de sincronia; gatilho depende de alguém lembrar de criá-lo em toda tabela nova, e de ele não
falhar em silêncio.

⚠️ **A busca em evidência é sobre o artefato CRU.** É o que permite achar um e-mail pelo que
estava escrito nele **antes** de existir qualquer interpretação. O limite é conhecido e
assumido: indexar JSON inteiro traz nomes de campo junto, então é mais ruidosa — e ainda
assim melhor que depender de uma interpretação que não existe.

⚠️ **A lista de resultados não mostra o conteúdo da evidência.** Artefato cru pode conter
dado pessoal, e lista de busca não é lugar de despejar isso.

### O defeito que a desconfiança achou

A primeira medição funcionou: `camacari` achou a empresa. **Poderia ter parado ali.** Mas o
município tinha vindo da fonte **sem cedilha** — o acerto podia ser sorte.

Testei a hipótese contrária, contra o banco:

```
to_tsvector('portuguese','SÃO PAULO') @@ websearch_to_tsquery('portuguese','sao paulo') -> FALSE
to_tsvector('portuguese','GOIANIA')  @@ websearch_to_tsquery('portuguese','goiânia')    -> FALSE
```

**Buscar "sao paulo" não achava "SÃO PAULO".** Num produto de inteligência corporativa
**brasileira**, isso não é detalhe: "São Paulo", "Goiânia", "Brasília" e "Camaçari" são a
norma, e cada fonte escreve de um jeito.

**Conserto dos dois lados** — e os dois eram obrigatórios: o índice passou a guardar sem
acento (`unaccent` com invólucro imutável, porque coluna gerada exige isso), e o **termo
digitado** passa por `semAcento` antes de ir. ⚠️ Consertar só um lado deixaria a busca **meio
consertada**, que é pior: funcionaria para quem digita sem acento e falharia para quem digita
certo.

**Medido depois:** as duas comparações passaram a dar `true`, e a empresa real continua sendo
encontrada.

**Verificação:** **72 testes verdes** · `tsc` 0 erros · publicado.

⚠️ **O que a busca ainda não faz:** ordenar por relevância, destacar o trecho que casou, nem
filtrar por período ou fonte. E não há tela de evidência — o resultado diz que o artefato
existe, mas não deixa abri-lo.

---

## 20/08/2026, 00h15 — "Nenhuma fonte cadastrada": erro de desenho meu, achado no primeiro uso

O dono consultou um CNPJ e recebeu *"Nenhuma fonte cadastrada para registrar a evidência."*

**A mensagem fez o trabalho dela** — disse exatamente onde parou, e eu não precisei de
nenhuma investigação. É o contraste com o dia inteiro de ontem, onde "Bad Request" e "não foi
possível completar a operação" custaram horas.

### A causa era desenho, não falha

A ação procurava uma fonte com `kind = 'api'`, e a única cadastrada era a de e-mail
(`kind = 'feed'`). **Eu exigia cadastro manual de fonte para cada provedor** — obrigando o
dono a configurar algo que o sistema já sabe.

**Conserto:** a ingestão **resolve a fonte pelo provedor que de fato respondeu**, e a cria se
não existir.

⚠️ **E resolver pelo provedor real não é detalhe.** Se um dia a consulta cair para o segundo
da lista, a evidência tem que dizer que veio **dele**. Uma fonte genérica "CNPJ" registraria
procedência errada — e **procedência errada é pior que ausente, porque parece confiável**.

### A trava, com o que ela protege escrito junto

`tests/ingest-cnpj.test.ts`, 4 casos com banco e rede de mentira:

1. **resolve a fonte sozinha** — não volta a exigir cadastro manual;
2. **grava a evidência ANTES da empresa**, conferindo a ordem exata das chamadas;
3. **CNPJ inválido não toca no banco** — nem uma escrita;
4. **quando a empresa falha, a evidência fica** — ela é verdadeira, e apagá-la para "limpar"
   destruiria o registro de que a consulta aconteceu.

⚠️ O caso 2 não é estético: empresa gravada antes da evidência, com a evidência falhando,
deixaria uma empresa apontando para nada. **Procedência que mente.**

### Provado antes de pedir para ele tentar de novo

A rede desta máquina não alcança os provedores, então não dá para rodar a ingestão inteira
daqui. Mas a peça nova toca o banco, e essa dá: **fiz o `upsert` da fonte com a sessão do
próprio dono** — que é onde a RLS decide — e voltou **HTTP 201**.

⚠️ **Isso importa como método:** mandar ele testar um conserto não testado transformaria o
dono em depurador do meu código.

**Verificação:** **69 testes verdes** · `tsc` 0 erros · publicado.

---

## 20/08/2026, 00h05 — autenticação, a primeira tela real, e um 404 que só a medição achou

**O dono abriu o site e disse "não aparece nada".** Ele estava certo do ponto de vista dele:
a página tinha um `<h1>` e uma linha de texto, sem CSS. Era tudo o que existia de tela — o
resto do dia foi servidor.

**Construído agora:** autenticação por e-mail e senha, middleware que renova a sessão, a tela
de workspace, e o estilo mínimo.

### A tela mostra a procedência AO LADO do dado, não numa aba

Cada empresa aparece com **fonte, data da coleta, confiança, quem produziu e o hash da
evidência** — na mesma ficha. O book proíbe *"dado na tela sem origem rastreável"*, e uma
ficha bonita com a origem escondida seria exatamente isso.

⚠️ **Confiança nula mostra "não informado", nunca um número.** É a mesma regra da coluna que
proíbe `default`: número na tela que ninguém decidiu é pior que campo vazio.

### O bug que só apareceu porque medi pela web

As guardas foram extraídas do Bahia Realty, onde a tela de login mora em `/login`. Aqui ela
mora em **`/entrar`** — e o redirecionamento veio junto, apontando para uma página que **não
existe**.

**Consequência real: qualquer pessoa não logada levaria 404.** Não um erro claro, não um
convite para entrar: 404. E `tsc`, testes e build passavam — nada disso olha para onde um
`redirect()` aponta.

Só apareceu porque testei **pela web**, como o dono usa, em vez de ler o código.

Segundo achado da mesma família: `requireOrgMember` mandava para `/onboarding`, que também não
existe. Virou `/sem-organizacao`, uma página que **explica** e oferece sair — e que
deliberadamente **não** oferece "criar organização", porque quem libera acesso é o operador.

### A trava para isso não se repetir

`tests/rotas-de-redirecionamento.test.ts` lê os `redirect()` literais das guardas e confere
que cada destino existe em `app/`.

⚠️ **A primeira versão dela reprovou uma rota que existe** — não entendia segmento dinâmico
(`/app/csi-brasil` mora em `app/app/[orgSlug]/`). **Trava com falso positivo é tão ruim quanto
trava que não pega: ensina a ignorar vermelho.** Corrigida para resolver `[param]`, e provada
nos dois sentidos.

### Medido no ar, depois de publicar

```
/                 -> 307 -> /entrar
/app/csi-brasil   -> 307 -> /entrar     (antes: /login, que dava 404)
/entrar           -> 200, formulário presente
```

E a sessão de verdade: login com a senha criada devolveu token, e a RLS mostrou **exatamente
uma organização** (`CSI Brasil`) e o papel `owner`.

**Acesso do dono** em `C:\Users\Windows\acesso-csi-brasil.txt` — única cópia, para trocar no
primeiro uso.

**Verificação:** **65 testes verdes** · `tsc` 0 erros · build completo · rotas medidas em
produção.

⚠️ **O que ainda não existe:** a tela lista e consulta, mas não há busca, filtro, nem tela de
evidência. E o estilo é mínimo de propósito — o design system é item da Fase 0 e não foi
decidido; adotar um framework agora seria difícil de desfazer.

---

## 19/08/2026, 23h45 — a entrada de e-mail funcionando em produção, e uma variável que faltava

**O dono pediu para configurar o Cloudflare Email Routing. Eu não consigo** — faltam um
**domínio** (o CSI está em `csi-brasil.vercel.app`) e **credenciais da conta Cloudflare**.
Não fingi que configurei: fiz tudo o que estava do nosso lado e escrevi o passo a passo.

### O banco estava vazio, e isso importava

Conferi antes de qualquer coisa: **0 organizações, 0 fontes, 0 evidências** — eu tinha
apagado todos os cenários de teste, corretamente. Mas sem organização e sem fonte, o
Cloudflare entregaria no vazio.

Criadas: organização **CSI Brasil** (a primeira real) e fonte **E-mail encaminhado**, com
token de webhook. O token foi para um arquivo na máquina do dono — o banco guarda só o hash,
então é a única cópia.

### Um erro meu de configuração, achado por medir em vez de presumir

Testei a rota em produção **antes** de mandar o dono configurar nada. O teste de token errado
devolveu **500 em vez de 401** — e a causa era minha: **`SUPABASE_SERVICE_ROLE_KEY` nunca foi
cadastrada na Vercel.** A rota usa o cliente de serviço, que **lança** quando a variável não
existe, e o 500 escondia isso.

⚠️ **Se eu tivesse mandado o passo a passo sem testar**, ele teria configurado o Cloudflare,
mandado um e-mail, recebido erro — e a investigação começaria pelo lado errado, no Cloudflare,
que estaria certo.

Cadastrada nos três ambientes e republicado. Medido depois:

```
sem token          -> 401
token errado       -> 401
sem remetente      -> 400  com o motivo por extenso
e-mail de verdade  -> 201  evidência gravada
```

E conferido **no banco**, não pela resposta: evidência ligada à fonte e à organização,
`collected_by_kind = rotina`, hash presente, e o remetente dentro do artefato cru.

### O passo a passo

`docs/COMO-LIGAR-ENTRADA-DE-EMAIL.md`, com o código do Email Worker pronto para colar.

⚠️ **Duas coisas escritas lá que valem mais que o resto:** o Worker **não pode engolir erro**
— se a nossa rota recusar, o erro sobe, porque e-mail que some em silêncio é a pior falha
possível numa entrada de dado. E **"configurei" não é prova**: é preciso mandar um e-mail de
verdade e conferir no banco.

### Uma regra do projeto que eu quebrei nesta própria tarefa

Eu vinha editando documentação com scripts Python pelo terminal. **A regra 2 diz para editar
com editor, nunca pelo terminal** — e ela existe justamente porque isso quebra em silêncio.
Nesta tarefa quebrou barulhento: o caminho `C:\Users\...` dentro de uma string Python virou
erro de escape, o script inteiro não rodou, e **o commit levou só metade do que eu pensei que
tinha escrito**. Percebi porque conferi a saída, não porque o comando avisou.

**Verificação:** 63 testes verdes · `tsc` 0 erros · rota provada em produção.

⚠️ **O que ainda NÃO existe:** nada lê essas evidências para virar conhecimento pesquisável.
A entrada está pronta; interpretar conteúdo de e-mail é a fatia seguinte.

---

## 19/08/2026, 23h30 — entrada de e-mail por webhook, e os tipos reais do banco

**Decisão do dono:** seguir a recomendação — **encaminhamento + webhook**, e não IMAP.
**Nenhuma senha de caixa de e-mail é guardada por nós.** É a razão inteira da escolha:
credencial de caixa dá acesso amplo e permanente, e guardar uma é assumir risco que não
precisa existir.

### O nosso lado está pronto

| Peça | O que faz |
|---|---|
| `0007_fonte_com_token_de_entrada.sql` | cada fonte que recebe por webhook ganha um token. **Guardamos o hash, nunca o token** |
| `lib/sources/email-entrada.ts` | lê o e-mail **agnóstico de serviço** — aceita `from`/`sender`/`FromFull`, `text`/`TextBody`, etc. |
| `app/api/entrada/email/route.ts` | identifica a fonte pelo token, grava o corpo **cru** como evidência com hash |

⚠️ **Unicidade do hash é GLOBAL, não por organização.** Se dois tenants pudessem ter o mesmo
hash, a rota teria que escolher um — e escolheria errado metade das vezes, entregando conteúdo
de um cliente para outro.

⚠️ **Token inexistente e fonte desligada recebem a MESMA resposta.** Dizer "essa fonte existe
mas está inativa" confirmaria a existência do token para quem estivesse adivinhando.

⚠️ **A rota grava primeiro e interpreta depois.** Formato de e-mail muda sem aviso — no outro
projeto, a especificação de um deles teve que ser lida de uma captura de tela. Guardar o cru
é o que permite reprocessar quando o formato mudar, sem ter perdido nada.

### Os tipos do banco, e uma previsão minha que se cumpriu

O banco agora existe, então **gerei os tipos dele** (523 linhas, com os relacionamentos
reais) e apaguei o esboço escrito à mão.

**E aí aconteceu o que eu tinha deixado escrito no código:** *"no dia em que os tipos forem
gerados, apague o `.returns<>()` e confira que o tipo inferido bate. Se não bater, o código
está errado, e este comentário terá sido a única pista."*

**Não bateu.** O banco devolve `role: string`, porque usei `text` + CHECK e não um enum do
Postgres. A asserção estava escondendo isso.

⚠️ **O conserto certo não foi forçar o tipo — foi validar na fronteira.** `ehPapelValido()`
verifica, e papel desconhecido no banco **lança** em vez de passar adiante. Asserção diz ao
compilador "confie em mim" e some com o problema; verificação transforma um papel inválido
(inserido à mão, sobrevivente de migration futura) em erro visível, em vez de acesso
silencioso.

### A dívida que isso criou, e a costura para ela

Como o banco usa `text` + CHECK, **a lista de papéis passou a existir em dois lugares** — no
código e no CHECK da migration. **Duas listas divergem em silêncio:** alguém acrescenta
`gerente` no banco e esquece o código, e a pessoa com esse papel fica sem acesso a nada sem
que nada quebre.

`tests/papeis-batem-com-o-banco.test.ts` costura os dois. Acrescentei `gerente` só no código,
de propósito, e **o teste ficou vermelho** antes de restaurar.

**Verificação:** **63 testes verdes** · `tsc` 0 erros.

**O que depende de você (item 25):** um **domínio** (o CSI está em `csi-brasil.vercel.app`, e
endereço de e-mail precisa de domínio próprio) e um **serviço de entrada** que chame nossa
rota — Cloudflare Email Routing é gratuito. ⚠️ **Escolher o serviço não muda nosso código**:
foi para isso que a leitura nasceu agnóstica.

---

## 19/08/2026, 23h20 — sem on-premise, e o e-mail vira fonte de busca

**Duas decisões do dono**, e a primeira encerra uma contradição que estava aberta desde o
Book v2.

### On-premise: não

**O CSI Brasil é somente operado pelo dono — nunca instalado no cliente.** A *"Enterprise
deployment option"* que o v2 lista na Fase 10 **sai do escopo**, e isso ficou escrito no
roadmap para ninguém construir em direção a ela.

**Duas consequências que valem estar registradas:**

1. **A porta jurídica do `elite-programa` fica aberta em definitivo.** A licença da Awave
   permite faturar com o **serviço**, não com o software — e nunca vai existir software
   entregue. Era exatamente essa dúvida que o v2 tinha reaberto às 18h45.
2. **Cliente que exigir isolamento recebe organização separada na nossa infraestrutura**, não
   instalação na dele. **A multi-tenancy que a Fase 1 provou é o que torna essa resposta
   possível** — sem ela, a única saída seria instalar no cliente, e a decisão de hoje seria
   impossível de sustentar.

### E-mail: fonte de busca, como as demais

Não é caixa de entrada a ser lida por gente: é **fonte**. O conteúdo entra no mesmo caminho de
todas as outras — vira **evidência guardada com hash**, e passa a ser pesquisável junto com o
resto. O desenho de `sources` e `evidence` já comporta isso sem mudança.

⚠️ **Mas falta o mecanismo, e ele muda o conector inteiro** (item 24):

| Como | O que exige |
|---|---|
| Caixa que **lemos** (IMAP) | **senha da caixa de e-mail** — credencial de acesso amplo, guardada por nós |
| Endereço que **recebe** (encaminhamento + webhook) | **nenhuma credencial de caixa** — por isso é a mais segura |
| Exportação manual de arquivos | trabalho humano recorrente |

⚠️ **E vale a advertência que o outro projeto deu hoje:** formato de e-mail muda sem aviso, e
a especificação de um deles teve que ser lida de uma **captura de tela**. Qualquer que seja o
mecanismo, o conteúdo cru vira evidência com hash **antes** de qualquer interpretação — que é
justamente o que o contrato de procedência já garante.

**Nenhuma linha de código nesta entrada.** São decisões e registro.

---

## 19/08/2026, 23h15 — a rota de diagnóstico fica, e o que "ficar" exigiu

**Decisão do dono:** manter a rota de diagnóstico. Pendência 23 fechada.

**Manter tem consequência, e ela não é deixar o arquivo lá.** Rota permanente que dispara
requisição externa precisa ter o comportamento de segurança **travado por teste**, não por
lembrança de quem escreveu.

**5 testes novos**, e o que mais importa é o primeiro: **sem `DIAGNOSTICO_SECRET`
configurado, a rota responde 503 — fechada, nunca aberta.** Se ela abrisse, qualquer ambiente
novo (um preview, um deploy de teste) nasceria com endpoint público que consulta em nosso
nome e gasta nossa cota.

Quebrei o 503 de propósito, trocando por "segue adiante", e **exatamente esse teste ficou
vermelho** antes de restaurar.

Os outros quatro: 401 sem cabeçalho, 401 com segredo errado, 200 com o segredo certo, e —
esse também vale — **sem `?cnpj=` responde 400 e `fetch` não é chamado**. Requisição externa
não se dispara por engano.

**E o mapa ganhou a seção 5**, que estava vazia: onde vive cada credencial e **se dá para ler
de volta**.

⚠️ **A senha do banco tem UMA cópia**, num arquivo na máquina do dono. O Supabase não a
mostra de novo — só permite redefinir. Ela não é usada pelo app (que usa a URL e a chave
anon); é para conexão direta.

**Verificação:** **55 testes verdes** · `tsc` 0 erros.

---

## 19/08/2026, 23h05 — a consulta real funciona, e ela revelou um provedor falhando em silêncio

**Pendência 22 fechada.** A máquina de desenvolvimento não alcança os provedores, então medi
**pelo deploy da Vercel** — do lugar onde o código realmente roda.

### A rota de diagnóstico

`app/api/diagnostico/cnpj/route.ts`, **protegida por segredo**. Rota que dispara requisição
externa sem autenticação é abuso esperando acontecer: qualquer um consultaria em nosso nome,
gastando nossa cota e sujando nossa reputação junto ao provedor.

⚠️ **Sem `DIAGNOSTICO_SECRET` configurado, ela responde 503 — fechada, não aberta.** Falhar
fechado é a única opção defensável: configuração ausente não pode virar porta.

⚠️ **Ela não grava nada.** É medição, não ingestão — diagnóstico que escreve no banco vira
dado de teste em produção.

### A medição

| Sem segredo | Com segredo |
|---|---|
| **HTTP 401** | **HTTP 200**, empresa normalizada, `erro_normalizacao: null` |

Três empresas reais resolvidas (Petrobras, Banco do Brasil, Bradesco), **97–246 ms**. E CNPJ
inválido devolveu `levou_ms: 0` — **nunca saiu da máquina**, como o teste com `fetch`
controlado prometia.

### O achado: a BrasilAPI falhava sempre, e ninguém veria

A primeira medição mostrou que quem respondia era a **Minha Receita — o segundo provedor**. O
primeiro estava falhando em toda consulta, e o resultado chegava certo assim mesmo.

**Isso é exatamente a classe de erro que me custou dois dias hoje de manhã no outro projeto:**
o sistema funcionando pelo caminho alternativo, o painel verde, e a falha invisível.

Acrescentei `recusasAnteriores` ao resultado da coleta e um `logError` quando alguém é pulado.
Aí a causa apareceu: **`BrasilAPI - CNPJ: HTTP 403`** — ela recusa requisição vinda da
infraestrutura da Vercel, bloqueio de datacenter.

**Conserto: inverter a ordem**, com o motivo escrito no código. Insistir num provedor que
sempre devolve 403 custava uma requisição perdida em **toda** consulta. A BrasilAPI fica como
alternativa — funciona de outras redes, e o dia em que a Minha Receita cair é justamente
quando ela importa.

**Medição depois da troca:** 97–184 ms, `recusas: []`.

⚠️ **Uma sutileza que quase me enganou:** a primeira consulta após o deploy ainda trouxe a
recusa antiga. Era propagação — a chamada pegou a versão anterior. **Repeti até ficar
consistente**, em vez de aceitar a primeira leitura.

**Verificação:** 50 testes verdes · `tsc` 0 erros · consulta real medida em produção.

---

## 19/08/2026, 22h50 — o conector, e a trava que precisava existir antes dele

**Tarefa 5 da Fase 2**, com a decisão do dono incorporada: **todas as fontes gratuitas agora,
CDL e pagas preparadas para depois**.

### A trava de destino veio primeiro — pendência 21 resolvida

`sources.endpoint` é texto livre, cadastrado por gente, e consumido por uma rotina que faz
requisição **a partir do servidor**. Servidor alcança o que navegador nunca alcançaria.

⚠️ **Lista de PERMITIDOS, não de proibidos.** Lista de proibidos é corrida que se perde:
sempre falta uma forma de escrever o mesmo endereço. **11 testes**, e três deles cobrem
ataques reais:

- **o truque do arroba** — `https://brasilapi.com.br@169.254.169.254/x`, onde o host de
  verdade é o que vem **depois** do arroba, e é assim que lista mal feita é enganada;
- **o endereço de metadados de nuvem** (`169.254.169.254`), que entrega credencial da
  infraestrutura inteira a quem fizer o servidor buscá-lo;
- **subdomínio parecido** — `brasilapi.com.br.evil.test` **termina** com o host permitido e
  não é ele.

Quebrei a comparação de igualdade para sufixo, de propósito, e **exatamente o teste do
subdomínio parecido ficou vermelho**.

⚠️ **E o conector não segue redirecionamento** (`redirect: "error"`). Conferir o destino e
depois deixar a resposta redirecionar é furar a própria trava — o host de chegada nunca foi
examinado. Tem teste conferindo que a opção está lá.

### O conector, agnóstico de provedor

`PROVEDORES_CNPJ` com os dois gratuitos, e a decisão registrada no próprio código:
**acrescentar provedor pago é acrescentar uma linha na lista** e um host nos permitidos. O
conector, a evidência e a procedência não mudam — porque a procedência guarda **qual provedor
respondeu**, não "Receita Federal".

**7 testes com `fetch` controlado**, e o mais importante deles não verifica mensagem: verifica
que **`fetch` não foi chamado** quando o CNPJ é inválido. Cota de fonte não se gasta com
pergunta que nunca deveria ter sido feita.

Quando todos os provedores falham, o motivo **nomeia cada um e o que respondeu** — não uma
frase genérica. Foi frase genérica que manteve uma campanha parada dois dias no outro projeto.

⚠️ **O que eu NÃO consegui provar daqui, e não vou afirmar:** a chamada real à internet.
A saída de rede desta máquina não alcançou o provedor — uma tentativa ficou pendurada dez
minutos. **O conector está testado na lógica, não contra a fonte viva.** A primeira consulta
real precisa ser observada, e o resultado registrado aqui.

**Verificação:** **50 testes verdes** · `tsc` 0 erros.

---

## 19/08/2026, 22h35 — a primeira tabela de conhecimento, e o caminho de procedência fechando

**Tarefas 3 e 4 da Fase 2 concluídas.** O contrato de procedência deixou de ser teoria.

### Validação e normalização — lógica pura, sem rede

`lib/sources/cnpj-validacao.ts` e `cnpj-normaliza.ts`, com **16 testes**.

⚠️ **O caso que quase todo validador ingênuo deixa passar:** CNPJ com todos os dígitos
iguais **passa na conta do módulo 11**. Sem a linha que o barra, `00000000000000` viraria
consulta à fonte, gastaria cota e viraria evidência de uma pergunta que nunca deveria ter
sido feita. Tem teste cobrindo os dez casos.

⚠️ **A regra que rege a normalização: campo ausente vira `null`, nunca zero, nunca string
vazia.** `capital_social` ausente **não** pode virar `0` — zero é uma afirmação ("esta
empresa tem capital zero") que ninguém mediu. Quebrei a função de propósito para devolver
zero e **só esse teste ficou vermelho**, antes de restaurar.

E a normalização **lança** quando a resposta não tem CNPJ válido ou razão social: a fonte
também erra, e resposta sem identidade não é uma empresa incompleta — não é uma empresa.

### `companies` — a primeira `@classe: conhecimento`

Com as 7 colunas de procedência. `evidence_id` é **`not null`**: empresa sem evidência não é
conhecimento, é palpite. `confidence` sem `default` e sem `not null`, como o contrato manda —
e a trava reprovaria quem acrescentasse.

⚠️ **A migration falhou na primeira tentativa, e o erro era meu:** escrevi um comentário
dizendo que a unicidade `(id, organization_id)` de `evidence` "já existia". Não existia — a
0005 deu essa unicidade a `projects`, `monitors` e `sources`, mas não a `evidence`, que ainda
não tinha filho. **O banco recusou com mensagem clara** (`42830`) em vez de aceitar calado.
Corrigido, e o comentário falso removido junto.

### A prova que fecha a fase

O plano definiu o critério: *"dado um CNPJ, existe no banco uma empresa cuja origem eu
consigo apontar — qual fonte, qual artefato, quando, e com que confiança — e o artefato
original está guardado para conferir."*

Fiz o caminho inteiro e **voltei por ele**:

```
razao_social       PETROLEO BRASILEIRO S A PETROBRAS
confianca          0.95
produzido_por      rotina
fonte              BrasilAPI - CNPJ
endpoint           https://brasilapi.com.br/api/cnpj/v1
coletado_em        20/08 01:15
hash               sha256-exemplo
razao_no_artefato  PETROLEO BRASILEIRO S A PETROBRAS
```

**A empresa aponta a evidência, a evidência aponta a fonte, e o texto guardado no artefato
bate com o campo derivado.** Cenário apagado em seguida.

**Verificação:** **32 testes verdes** · `tsc` 0 erros.

**Falta a Tarefa 5:** o conector que de fato chama a rede. É onde entra a decisão do dono —
**todas as fontes gratuitas agora, CDL e pagas preparadas para depois** — e onde a pendência
21 (endpoint controlável = risco de o servidor buscar endereço interno) precisa ser resolvida.

---

## 19/08/2026, 22h25 — revisão de segurança achou um vazamento entre organizações, e ela tinha razão

Uma revisão automática dos commits apontou três achados. **Não aceitei nem descartei de
cabeça: testei contra o banco.** O primeiro estava certo, e era sério.

### O vazamento — confirmado por teste antes de consertado

As chaves estrangeiras apontavam só para `id`. A RLS confere o `organization_id` **da própria
linha**, mas nunca verificava se a linha **referenciada** é da mesma organização. Medido com
um usuário que só pertence à Org A:

```
grava evidência da Org A apontando fonte da Org B  -> PASSOU
cria monitor da Org A apontando projeto da Org B   -> PASSOU
```

**Consequências reais:** procedência corrompida — a evidência declara uma fonte que não é
sua, e a Fase 7 inteira se apoia nessa declaração — e confirmação da existência de ids
alheios pelo comportamento da chave estrangeira.

⚠️ **Isto passou pelas duas travas e pela prova de RLS de 21h55.** A prova de lá era honesta e
continua valendo: ela mediu *"cada um vê só o seu"*. **Não mediu *"cada um só consegue
apontar para o seu"***. São perguntas diferentes, e eu só tinha feito a primeira.

### O conserto foi no banco, não em policy

`0005_chaves_com_tenant.sql`: unicidade `(id, organization_id)` nas tabelas-pai e **chave
estrangeira composta** nas filhas.

**Por que composta e não policy:** policy é regra que alguém precisa lembrar de escrever em
cada tabela nova. Chave composta é **estrutura** — o banco recusa mesmo que a consulta
esqueça, e **mesmo em rotina com papel de serviço, que ignora RLS**. É a mesma lição do
projeto anterior: a trava que vale é a que não depende de disciplina.

**Provado com o mesmo teste, resultado invertido:** os dois inserts agora são barrados com
`23503`.

### O segundo achado: a trava tinha um escape

O teste que proíbe policy de escrita em evidência casava numa **janela de 200 caracteres**
depois de `create policy`. Uma policy com nome longo escapava — a trava ficaria verde sobre
exatamente o que existe para impedir.

Reescrito para **fatiar por `create policy`**, sem janela. E, no caminho, apareceu um caso que
a versão original nem considerava: **policy sem `for` significa `ALL` no Postgres**, o que
inclui UPDATE e DELETE. Agora é pego.

Ambos provados quebrando: nome longo → vermelho; `for` ausente → vermelho.

### O terceiro achado, e uma honestidade

A notificação truncou o terceiro. **Não sei qual era**, e não vou fingir que tratei. Revendo o
que escrevi, o candidato mais provável é `sources.endpoint`: é texto livre que a rotina de
coleta vai **chamar por HTTP**. Endpoint controlável por quem cadastra a fonte é caminho
clássico para fazer o servidor buscar endereço interno. **Registrado como pendência 21**, para
resolver na Tarefa 5, quando o conector existir — validar contra lista de destinos
permitidos, não confiar no campo.

**Verificação:** 16 testes verdes · `tsc` 0 erros · cenários de teste apagados do banco.

---

## 19/08/2026, 22h15 — Fase 2 começou, e o contrato ganhou uma terceira classe

**Plano da Fase 2 escrito** (`docs/superpowers/plans/2026-08-19-fase-2-primeiro-conector-cnpj.md`),
com uma decisão de fonte que contraria a leitura literal do book — e o porquê registrado.

### A decisão de fonte

O book aponta **Receita Federal — Dados Abertos** como prioritária. Mas os Dados Abertos são
o **dump completo**: vários gigabytes por mês, dezenas de milhões de estabelecimentos. Como
**primeiro** conector, ele prova a coisa errada — a fatia inteira iria para infraestrutura de
carga, sem exercitar procedência, evidência nem busca.

**Decisão: começar por consulta sob demanda** a uma API pública que serve os mesmos dados
cadastrais da Receita, um CNPJ por chamada. A origem do dado é a mesma; muda o modo de
acesso. ⚠️ **O dump não sai do roadmap** — volta quando a pergunta for *"quais empresas de tal
CNAE em tal cidade"*, que consulta sob demanda não responde.

⚠️ **A procedência vai registrar QUAL API respondeu**, não "Receita Federal". Se a
intermediária estiver desatualizada, a diferença entre *"veio da Receita"* e *"veio da API X
que diz vir da Receita"* é a diferença entre evidência e suposição.

### O contrato de procedência ganhou uma terceira classe — e foi bom que tenha sido assim

Eram duas: `configuracao` e `conhecimento`. **A primeira tabela real de dado mostrou que
faltava uma.** A tabela de evidência guarda o artefato bruto: não é o que o operador pediu, e
não cabia em `conhecimento`, cujas 7 colunas exigem `evidence_id` — a evidência apontaria para
si mesma. E não tem `transform_id`, porque não foi derivada: foi **capturada**.

Nova classe **`evidencia`**, com 4 colunas próprias: `source_id`, `collected_at`,
`content_hash`, `collected_by_kind`.

⚠️ **`content_hash` é o que separa evidência de cópia** — é ele que permite afirmar que o
guardado é o mesmo que a fonte respondeu.

**Contrato que nunca encosta num caso real é opinião.** Este encostou na primeira tentativa e
mudou — o que é o comportamento certo, não uma falha do contrato original.

### O que entrou

| Arquivo | O que faz |
|---|---|
| `CONTRATO-DE-PROCEDENCIA.md` | a terceira classe, com o porquê |
| `tests/rastreabilidade-do-conhecimento.test.ts` | duas travas novas: colunas de evidência, e **evidência não pode ter policy de UPDATE/DELETE** |
| `supabase/migrations/0004_fontes_e_evidencias.sql` | `sources` e `evidence`, aplicada no banco |

**As duas travas novas foram provadas quebrando:** evidência sem `content_hash` → vermelho
nomeando as duas faltas; evidência com `create policy ... for update` → vermelho nomeando a
policy.

### A prova que fecha a fatia: evidência é imutável de verdade

Não bastava a policy existir. Com um usuário real e sessão simulada (`authenticated`, não
superusuário — superusuário ignora RLS e o update passaria):

```
tentativa de ADULTERAR a evidencia -> linhas alteradas: 0
hash gravado continua: hash-original
```

⚠️ **E o `update` não devolveu erro nenhum.** Quem conferisse pelo status teria concluído que
funcionou. É por isso que a conferência conta **linhas afetadas** — a mesma lição que hoje de
manhã, no outro projeto, separou "campanha enviando" de "campanha queimando lead".

Cenário de teste apagado em seguida: 0 evidências, 0 fontes, 0 usuários.

**Verificação:** **16 testes verdes** · `tsc` 0 erros.

**Falta nesta fase:** validação e normalização de CNPJ (Tarefa 3), a tabela `companies` — a
primeira `@classe: conhecimento` (Tarefa 4) — e a ingestão que preenche a procedência
(Tarefa 5).

---

## 19/08/2026, 21h55 — o banco existe, e a RLS foi PROVADA cortando

**Decisão do dono:** criar o projeto Supabase — na organização **Imoveiseluxo's Org**, depois
de eu apresentar o custo (~US$ 10/mês por projeto adicional no plano Pro; as duas orgs estão
em Pro).

**Projeto:** `CSI Brasil`, ref `mmgucspxrfxdcztkrklb`, região **sa-east-1 (São Paulo)** —
escolhida porque o produto é inteligência corporativa **brasileira** e latência de banco pesa.

**Aplicado, uma coisa de cada vez e parando no primeiro erro** (aplicar em lote esconde qual
falhou e deixa o banco num estado que ninguém sabe descrever): extensão `pgvector`, depois
`0001_organizations.sql`, `0002_projects.sql` e `0003_monitors.sql`.

### A conferência estrutural — medida, não presumida

| O que | Resultado |
|---|---|
| RLS nas 5 tabelas | `ligada=true` em todas, **`forcada=false`** — o `FORCE` que causa recursão não entrou |
| `is_org_member` e `has_org_role` | `definer=true` **e** `search_path=public, row_security=off` — os **dois** necessários |
| pgvector | versão **0.8.2** instalada |
| `query_versions` | policies **só de SELECT e INSERT** — sem UPDATE, sem DELETE. Histórico imutável |

### A prova que o plano exigia: a RLS realmente corta?

Criei duas organizações, dois usuários e um projeto em cada; simulei a sessão de cada um
**dentro do banco** (`set local role authenticated` + `request.jwt.claims`, que é como o
PostgREST avalia — rodar como superusuário ignora a RLS e daria verde falso):

```
verdade no banco (superusuário): 2 projetos
usuário da Org A: vê 1 -> Projeto da A
usuário da Org B: vê 1 -> Projeto da B
```

**E limpei tudo em seguida:** 0 projetos, 0 organizações, 0 usuários. **Banco novo não nasce
com dado de teste** — dado de teste em base nova é o que depois vira "esse registro é real?"
seis meses adiante.

### O site ligado ao banco

`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` cadastradas na Vercel nos três
ambientes (6 variáveis), e **republicado** para valerem — variável cadastrada só passa a
existir no deploy seguinte. https://csi-brasil.vercel.app continua respondendo **200**.

⚠️ **A senha do banco está em `C:\Users\Windows\senha-banco-csi-brasil.txt` e é a única
cópia.** O Supabase não a mostra de novo — só permite redefinir. Guardar em gerenciador de
senhas e apagar o arquivo.

### O que isto fecha, e o que não

**Fecha as pendências 19 e 20:** as migrations deixaram de ser texto, e o site deixou de estar
no ar sem as variáveis do banco. **A Fase 1 está concluída de verdade** — as três tarefas que
estavam em amarelo saíram de lá.

**Não fecha o produto.** Continua sem autenticação configurada, sem tela de workspace e sem
uma linha de dado real. O que existe agora é fundação **provada**, que é diferente de
fundação escrita.

---

## 19/08/2026, 21h40 — publicado na Vercel

**Pedido do dono:** publicar o CSI Brasil agora.

**No ar:** https://csi-brasil.vercel.app — **HTTP 200**, e o conteúdo confere ("CSI Brasil /
Fundação em construção"). Projeto `csi-brasil` no escopo `jefferson-cs-projects`, o mesmo do
Bahia Realty. Deploy `● Ready` em Production, 20s de build.

⚠️ **Duas URLs, e só uma serve de prova.** A URL do **deploy**
(`csi-brasil-6afce1r7r-...vercel.app`) responde **302** — proteção de acesso da Vercel. A
**pública** responde 200. Medir pela primeira testaria a página de login, não o site: é a
mesma armadilha que já custou uma conferência falsa no outro projeto.

⚠️ **O que está no ar é uma página de espera, e é importante não confundir com produto.** Não
há workspace, login, banco nem dado. **As variáveis do Supabase não existem** —
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão ausentes, porque não há
projeto Supabase. O build passa sem elas só porque a página atual não toca no banco: **é
verde que não prova nada sobre o encanamento de dados**, e no dia em que a primeira tela ler
o banco, o deploy quebra se elas não estiverem lá.

**O que isto entrega de útil, apesar disso:** o caminho de publicação existe e foi exercitado
de ponta a ponta. Quando houver o que mostrar, já se sabe que publicar funciona.

**Sobre um código que o dono enviou:** ele passou `NU46DHMZ6SKGBDSBTK2ITRQBDONVDXJY` como se
fosse token da Vercel. **Testei: foi recusado.** Pelo formato — 32 caracteres em base32
maiúscula — é quase certamente **semente de autenticação em dois fatores** ou código de
recuperação. Ficou registrado o aviso para ele reconfigurar o 2FA da Vercel. E nenhum token
era necessário: a CLI desta máquina já está autenticada.

---

## 19/08/2026, 21h30 — Fase 1 fechada até onde dá sem banco

**Fechamento da tarefa.** O mapa e o plano passaram a dizer o estado real, que é o passo que
faltava para a tarefa estar concluída — e não só "o código está lá".

**O que entrou agora:**

- **Mapa, seção 13** — as cinco tabelas registradas com a **classe** de cada uma e, sobretudo,
  a coluna **"quem escreve nela"**. Hoje ela está inteira em *"ainda não existe"*, de
  propósito: é assim que se vê que nenhuma tela preenche nada ainda. No projeto anterior,
  três campos existiam sem ninguém escrever neles, e painéis e alertas ficaram pendurados em
  zero por semanas.
- **Plano da Fase 1** — quadro de estado no topo, separando o que está **concluído** do que
  está **escrito e não aplicado**. Sem isso, quem abrir o plano amanhã lê seis tarefas e
  supõe seis prontas.

### Estado da Fase 1

| Tarefa | Estado |
|---|---|
| 1 — Trava do tenant | ✅ concluída, provada quebrando de propósito |
| 1b — Trava da rastreabilidade | ✅ concluída, provada nos 4 casos |
| 3 — Matriz de papéis | ✅ concluída, 7 testes |
| 2, 4, 5 — Migrations | 🟡 **escritas, NÃO aplicadas** |

**Verificação final:** `tsc --noEmit` **0 erros** · **14 testes verdes** · `biome check` limpo
· `next build` completo.

### O que a Fase 1 NÃO entregou, e é importante não confundir

Não há banco, migration aplicada, autenticação configurada, tela de workspace nem uma linha
de produto navegável. **O que existe é a fundação e as duas travas** — o que impede a próxima
tabela de nascer errada.

**Três coisas destravam o resto, e nenhuma é código:**

1. **Projeto Supabase** (PostgreSQL + pgvector) — sem ele as três migrations continuam sendo
   texto, e a pendência 19 continua aberta.
2. **Decisão 2** — on-premise ou só operado por você. Muda o que pode ser usado como
   referência.
3. **Cláusula de finalidade do contrato com a CDL** (pendência 18), se CPF for entrar algum
   dia.

**O que eu afirmei errado hoje neste projeto, e corrigi:** disse que consulta de CPF *"ou é
credencial restrita, ou é comércio irregular"*, tratando o primeiro caminho como exótico —
existe integração com a CDL, e ela é a via legítima. Corrigido às 20h57, com o ponto que não
muda: credencial não é base legal.

---

## 19/08/2026, 21h20 — as três migrations escritas, e uma falha na minha própria trava

**Decisão do dono:** *"escreve as migrations agora, eu aplico depois"* — dívida assumida
conscientemente, e registrada como dívida na pendência 19, não como tarefa concluída.

**Escritas:** `0001_organizations.sql` (organizações, membros e os helpers `is_org_member` /
`has_org_role`), `0002_projects.sql` e `0003_monitors.sql` — exatamente como o plano aprovou.

**⚠️ O achado da sessão: a primeira migration real reprovou na MINHA PRÓPRIA TRAVA, e o
motivo era um defeito dela.**

O teste "ninguém usa FORCE ROW LEVEL SECURITY" procurava a frase no arquivo inteiro — e casou
com o **comentário** que eu tinha escrito na própria migration avisando *"NUNCA usar FORCE ROW
LEVEL SECURITY"*. A trava não distinguia comentário de comando.

Isso não é detalhe de expressão regular. **Uma trava que proíbe documentar o próprio perigo
ensina a não documentar** — e a documentação é justamente o que impede a próxima pessoa de
cair. Se eu tivesse "consertado" apagando o comentário, teria removido o aviso e mantido o
defeito.

**Conserto:** as checagens que buscam **comando** passam a ignorar comentários. As que buscam
`@classe` **não** podem ignorar — a declaração de classe vive num comentário, e essa exceção
ficou escrita no código para ninguém "simplificar" isso depois.

**Provado dos dois lados:** com o conserto, 14 verdes; e com um `alter table ... force row
level security` de verdade numa migration de teste, o teste **volta a reprovar**. Ou seja,
parou de reprovar comentário sem parar de pegar código.

**Verificação:** `tsc --noEmit` 0 erros · **14 testes verdes** · `biome check` limpo.

**O que NÃO está feito, e é o principal:** as migrations **nunca tocaram um banco**. Enquanto
isso durar, o repositório descreve um banco que não existe. A pendência 19 lista as três
conferências obrigatórias no dia da aplicação — incluindo a de que `update` em
`query_versions` afeta **zero linhas**, lembrando que o Postgres **não dá erro** nesse caso.

---

## 19/08/2026, 21h05 — as duas travas da Fase 1, provadas antes de existir a primeira tabela

**Tarefas 1 e 1b do plano da Fase 1, concluídas.** São as únicas totalmente verificáveis sem
banco — e as duas precisam existir **antes** da primeira tabela, pelo mesmo argumento:
*regra que nasce depois da primeira violação já nasceu tarde.*

**O que entrou:**

| Arquivo | O que trava |
|---|---|
| `tests/toda-tabela-e-multi-tenant.test.ts` | Tabela sem `organization_id`, sem RLS, ou com `FORCE ROW LEVEL SECURITY` |
| `docs/CONTRATO-DE-PROCEDENCIA.md` | O contrato: duas classes declaradas, e as 7 colunas de procedência |
| `tests/rastreabilidade-do-conhecimento.test.ts` | Tabela sem classe declarada, classe inválida, `conhecimento` sem procedência, e `confidence` com `default`/`not null` |

**Uma decisão de implementação que vale registrar:** a primeira trava confere
`organization_id` **dentro do corpo da própria tabela**, não em qualquer lugar do arquivo.
Sem isso, numa migration que cria duas tabelas, a segunda passaria de carona na declaração da
primeira — e o teste ficaria verde sobre um buraco.

**As quatro provas, todas vistas vermelhas:**

| Migration errada de propósito | Falhou em |
|---|---|
| Tabela crua, sem nada | `organization_id`, RLS **e** classe — 3 testes |
| `-- @classe: qualquer` | "a classe declarada é uma das duas" |
| `-- @classe: conhecimento` sem as colunas | as **7** faltas, nomeadas uma a uma |
| `confidence numeric(3,2) not null default 1` | "confidence não nasce com default" |

⚠️ **O quarto caso é o que mais importa**, e por isso foi escrito à mão exatamente como
alguém escreveria sem pensar: `default 1` é o jeito mais natural, e produz precisamente o
campo que ninguém preencheu com um número que parece medido.

**Verificação:** `tsc --noEmit` 0 erros · **14 testes verdes** · `biome check` limpo ·
`next build` completo.

**O que ficou aberto, e por quê:** as Tarefas 2, 4 e 5 escrevem migrations, e cada uma tem
passo de **aplicar e conferir no banco** — *"conferir que a RLS realmente corta"*, com dois
usuários de organizações diferentes. **Não existe projeto Supabase ainda.** Escrever a SQL
sem aplicar criaria exatamente a dívida que no outro projeto deixou um alerta de segurança no
ar por dias: migration escrita, nunca aplicada, e o repositório mentindo sobre o banco.
**Parei aqui de propósito** — o próximo passo depende de criar o projeto Supabase.

---

## 19/08/2026, 20h57 — correção: o acesso a CPF existe, via CDL

**Corrijo uma afirmação minha de sete minutos atrás.** Escrevi que consulta de CPF *"ou é de
acesso restrito com credencial própria, ou é comércio irregular de dado pessoal"*, tratando o
primeiro caminho como se fosse exótico. **Não é.** O dono informou que existe **integração
com a CDL** — que é exatamente a via legítima e contratada.

**O que a correção muda:** a disponibilidade técnica. O caminho existe e é legítimo.

**O que a correção NÃO muda, e é o ponto:** ter credencial responde *"eu consigo
consultar?"*. A LGPD pergunta outra coisa: *"por que, com que finalidade, com que
minimização, por quanto tempo, e como o titular exerce direitos?"* — e o book exige
exatamente isso, **registrado por conector**, antes da primeira linha.

⚠️ **E aqui há um risco específico deste caso, que é o mais provável de morder na prática.**
Credencial de birô (CDL/SPC) é contratada **para uma finalidade** — tipicamente análise de
crédito e consulta cadastral, dentro de uma relação em que o consultado é parte. Usar essa
mesma credencial para alimentar um produto de inteligência corporativa é **finalidade
diferente da contratada**: é o que a LGPD chama de finalidade incompatível, e o que costuma
estar vedado no próprio contrato do birô. **A consequência prática não é só jurídica — é o
tipo de uso que faz a credencial ser revogada.**

**Próximo passo, e é de leitura, não de código:** ler a cláusula de finalidade / uso
permitido do contrato com a CDL e transcrever na pendência 18 o que ela autoriza. Isso decide
se CPF entra no roadmap, com qual finalidade declarada, ou se fica fora.

**O que não muda de qualquer forma:** a **ordem**. CNPJ continua sendo o primeiro conector,
pelo argumento técnico — chave canônica e procedência sem ambiguidade —, que independe de
haver ou não acesso a CPF.

⚠️ **A mensagem do dono chegou cortada** (*"temos integração com a CDL e"*). O que vem depois
do "e" pode mudar esta análise, e está pendente.

---

## 19/08/2026, 20h50 — CNPJ é a primeira fonte; CPF fica fora, e e-mail fica depois

**Decisão do dono:** CNPJ primeiro. Pediu que ficasse registrado **por que não pode ser CPF
nem e-mail**.

**A resposta tem duas naturezas, e é importante não misturar: CPF é impedimento JURÍDICO;
e-mail é impedimento TÉCNICO de ordem.**

### Por que não CPF — e não é "depois", é outro regime

**Medido no book v2: a palavra CPF aparece ZERO vezes. CNPJ aparece 21.** O book prioriza
CNPJ, PNCP e CVM, e sobre dado pessoal determina: *"finalidade e base legal registrada por
tratamento/conector"*, *"minimização"*, *"direitos do titular"* e, para legítimo interesse,
*"avaliação documentada de finalidade, necessidade, balanceamento, salvaguardas e legítima
expectativa"*. A regra de interpretação fecha: a plataforma *"não é uma ferramenta de
intrusão ou vigilância clandestina"*, e *"nada de coleta clandestina ou abuso de dados
pessoais"*.

Três diferenças concretas:

1. **Base pública existe para CNPJ e não existe para CPF.** A Receita publica a base de CNPJ
   como dado aberto. Não há equivalente para CPF: serviço que "consulta CPF" é de acesso
   restrito com credencial própria, ou é comércio irregular de dado pessoal.
2. **Empresa não é titular de dado pessoal; pessoa é.** Com CNPJ, a base legal é trivial —
   dado público. Com CPF, seria preciso ter finalidade, base legal, minimização, retenção e
   fluxo de direitos do titular **prontos antes** da primeira linha do conector.
3. **O primeiro conector define o que o produto é.** Nascer consultando CPF definiria o CSI
   Brasil como exatamente aquilo que o book proíbe — e nenhuma tela bonita depois desfaz isso.

⚠️ **Nuance honesta, registrada para não virar descuido:** o CNPJ de **MEI** carrega nome e às
vezes endereço de pessoa física. Dado pessoal entra pela porta do CNPJ mesmo. Por isso
minimização vale **já no primeiro conector**, não só no dia em que alguém pedir CPF.

### Por que não e-mail primeiro — e este é só de ordem

E-mail **não está proibido**; está na fila. Ele não prova o encanamento: prova a leitura de
formato.

1. **Não tem chave canônica.** O CNPJ **é** o identificador — que é justamente o que o
   Canonical Entity Model precisa. Um e-mail não tem entidade canônica: tem remetente, assunto
   e texto.
2. **A procedência fica ambígua na primeira pergunta.** O contrato exige `source_id`,
   `evidence_id` e `confidence`. Com CNPJ: fonte é a Receita, evidência é o registro
   devolvido, confiança é alta e justificável. Com e-mail: a fonte é o remetente? a caixa? o
   sistema que encaminhou? Começar pelo caso ambíguo é definir o contrato no pior exemplo.
3. **O formato muda sem avisar, e isso aconteceu hoje.** No outro projeto, o portal Chaves na
   Mão entrega lead por e-mail; a especificação teve que ser lida de **uma captura de tela**;
   o campo do imóvel se chama `reference` do lado deles e `propertyRef` do nosso — e sem o
   sinônimo o dado chegaria e seria **ignorado em silêncio**. Nada disso teria dado erro.

**Ordem registrada:** CNPJ prova o caminho inteiro (coletar → normalizar → guardar com
procedência → buscar) com formato estável. E-mail entra depois, com o caminho já provado, e
aí o trabalho é só o formato.

⚠️ **Ainda falta saber o que "e-mail" significa aqui** — caixa nossa recebendo boletins,
aviso de parceiro, ou outra coisa. Isso muda o conector inteiro, e continua na pendência 16.

---

## 19/08/2026, 20h45 — regra permanente: registro a cada tarefa concluída

**Pedido do dono:** ter aqui a mesma regra de registro que existe no Bahia Realty.

**O que estava fraco:** a regra existia, mas como **uma linha numa tabela**. No Bahia Realty
ela é seção própria, com o porquê junto — e é por isso que lá ela pega. Regra escrita de
passagem é regra que se cumpre de passagem.

**O que entrou:**

- `CLAUDE.md` ganhou a seção **"Regra permanente do dono: registro a cada tarefa concluída"**,
  com as **cinco coisas** que todo registro precisa ter: o que foi feito · **o que foi
  medido, com número** · o que eu afirmei e estava errado · o que ficou aberto · o que **não**
  foi feito de propósito.
- `docs/REGRAS-DE-EXECUCAO.md` passou a exigir o registro **dentro** da verificação
  obrigatória — antes de a tarefa poder ser chamada de concluída, junto com tipos, testes e
  build.
- Combinada a **cópia espelhada** em `Documents\RELATORIO COMPLETO CSI BRASIL.md`, como no
  Bahia Realty, para o dono ler sem abrir o repositório.

**A frase que sustenta a regra:** ⚠️ *verde não é registro*. "Os testes passaram" descreve o
status; o registro diz **o que mudou no mundo**. No outro projeto, `succeeded` no banco,
HTTP 200 e teste verde já esconderam cliente sem atendimento, campanha queimando lead e
e-mail que nunca saiu.

**O que não mudou:** nenhuma linha de código. Isto é regra de processo.

---

## 19/08/2026, 20h36 — banco decidido, e a primeira fonte quase

**Duas decisões do dono:**

1. **Banco: PostgreSQL + pgvector.** Busca textual, busca vetorial e grafo inicial ficam
   todos no Postgres. OpenSearch, ClickHouse, Neo4j, Kafka e Temporal **saem do MVP** — sete
   peças a menos para operar antes de existir o primeiro usuário. ⚠️ O teto é conhecido e
   fica escrito: volume de evento e série temporal um dia pede banco analítico, e essa será
   uma decisão **medida**, quando o número aparecer.
2. **Primeira fonte: CNPJ e e-mail.**

**A segunda decisão levantou uma pergunta que precisa de resposta antes de virar código**,
registrada como pendência 16. O plano manda a Fase 2 começar com **um** conector, e as duas
fontes escolhidas são de natureza oposta:

- **CNPJ** é oficial, estruturada, com esquema estável. Prova o caminho inteiro — coletar,
  normalizar, guardar com procedência, buscar — sem lutar contra o formato.
- **E-mail** é o contrário: texto livre, formato que muda sem aviso, remetente decidindo o
  layout.

⚠️ **Isso não é teoria: aconteceu hoje mesmo no outro projeto.** O portal Chaves na Mão
entrega lead por e-mail, não existe ingestão de e-mail no sistema, os leads ficam parados
numa caixa postal — e a especificação do que vem no e-mail teve que ser lida de **uma captura
de tela**. Começar a Fase 2 pelo caminho mais frágil significa depurar formato de e-mail
antes de ter provado que o encanamento funciona.

**Recomendação registrada: CNPJ primeiro, e-mail depois**, com o caminho já provado. E falta
saber o que "e-mail" significa aqui — caixa nossa recebendo boletins, aviso de parceiro, ou
outra coisa. A resposta muda o conector inteiro.

---

## 19/08/2026, 20h30 — a base extraída do Bahia Realty, arquivo por arquivo

**Decisão do dono:** extrair, com uma condição dura — *"isso não pode prejudicar em nada o
projeto Bahia Realty"*.

**A condição virou medição, não promessa.** Antes de começar, gravei a linha de base do
outro projeto: `HEAD 0648db2`, branch `main`, zero arquivos modificados. Trabalhei **só
lendo** de lá. Ao terminar, conferi: **mesmo commit, zero alterações, nenhum commit novo**.

**O que veio, e por quê:**

| Arquivo | Decisão |
|---|---|
| `package.json` | **6 dependências**, não as 40 de lá. Sem SDK de IA, sem gráficos, sem e-mail, sem arrastar-e-soltar — nada que a Fase 1 não use |
| `tsconfig.json` · `biome.json` · `vitest.config.ts` | Extraídos quase inteiros: são a régua, e a régua boa é a mesma |
| `tests/stubs/server-only.ts` | Extraído com o motivo junto: sem ele, o `import "server-only"` derruba todo teste que toque no cliente de serviço |
| `lib/supabase/server.ts` · `service.ts` | Extraídos. O `import "server-only"` veio junto — é ele que **quebra o build** se um componente de navegador importar a chave que ignora RLS |
| `lib/logger.ts` | Extraído **com o limite escrito**: ele não imprime `cause`, e foi isso que escondeu por dois dias a causa de 63 falhas de envio no outro projeto |
| `lib/auth/permissions.ts` | **Adaptado.** Quatro papéis (`owner`, `admin`, `analyst`, `viewer`) em vez dos seis de lá — papel só entra quando existe tela que ele precisa e outra que não pode ver |
| `lib/auth/guards.ts` · `lib/orgs/queries.ts` | Adaptados às rotas e papéis daqui |

**⚠️ Uma sobra de molde interceptada antes de entrar.** O `.gitignore` do Bahia Realty
ignora `docs/superpowers/` — lá os planos são artefato descartável. **Aqui os planos das
Fases 0 e 1 são a especificação executável e estão versionados.** Copiar aquela linha faria
o repositório parar de rastrear os dois planos, sem erro e sem aviso. O `.gitignore` daqui
tem o motivo escrito no lugar da linha, para ninguém "corrigir" isso depois.

**⚠️ O que NÃO foi extraído, de propósito:** `requireMfaSatisfied`. Ele redireciona para uma
tela `/mfa` que aqui não existe, e guarda apontando para página inexistente é pior que guarda
nenhuma. Virou a pendência **15** — registrado, não esquecido.

**⚠️ Uma dívida assumida às claras:** `types/supabase.ts` é um **esboço escrito à mão**,
porque o banco ainda não existe. Ele não descreve o banco: descreve o que o código espera
dele. Como o esboço não modela relacionamentos, as duas consultas com `join` usam
`.returns<>()` — **asserção declarada e comentada**, não inferência. No dia em que o arquivo
for gerado do banco, o `.returns<>()` sai e o tipo inferido precisa bater. Se não bater, o
código está errado, e aquele comentário será a única pista.

**O primeiro teste de verdade:** `tests/permissoes.test.ts`, 7 casos sobre a matriz de
papéis — lógica pura, sem banco. O mais importante deles é *"seção desconhecida é recusada,
não liberada"*: **negar é o padrão**. Quebrei `canAccess` de propósito para devolver `true`
no desconhecido e vi **exatamente esse** teste ficar vermelho, sozinho, antes de restaurar.

**Verificação:** `tsc --noEmit` 0 erros · **7 testes verdes** · `biome check` limpo ·
`next build` completo.

**O que isto NÃO é:** ainda não há banco, migration aplicada, tela de workspace nem
autenticação configurada. A Fase 1 continua dependendo das decisões 2, 3 e 4.

---

## 19/08/2026, 20h — plano da Fase 1 revisado com a regra de rastreabilidade

**A conclusão da revisão é mais estreita do que o problema parecia, e isso é o resultado.**

A regra do Book v2 diz que cada nó e cada aresta precisam ser rastreáveis. A leitura
apressada seria acrescentar `fonte`, `evidência` e `confiança` em toda tabela da Fase 1.
**Seria errado.** As cinco tabelas desta fase — `organizations`, `memberships`, `projects`,
`monitors`, `query_versions` — são **configuração de trabalho**: registram o que o operador
pediu, não o que o sistema descobriu no mundo. Não são nó, aresta nem fato extraído.

Enchê-las de colunas de procedência produziria exatamente o **risco 13** desta lista —
*campo que ninguém preenche* —, que no projeto anterior deixou painéis, alertas e e-mails
automáticos pendurados em campos que nenhuma linha de código escrevia.

**O que a regra exige da Fase 1 é o contrato e a trava**, pelo mesmo motivo que a Tarefa 1
existe: regra que nasce depois da primeira violação já nasceu tarde. A primeira tabela de
conhecimento aparece na Fase 2.

**O que entrou no plano:**

1. **`docs/CONTRATO-DE-PROCEDENCIA.md`** — duas classes declaradas explicitamente
   (`configuracao` / `conhecimento`) e as **7 colunas** obrigatórias na segunda:
   `source_id`, `evidence_id`, `transform_id`, `produced_by_kind`, `produced_by`,
   `produced_at`, `confidence`.
2. **Tarefa 1b — a segunda trava** (`tests/rastreabilidade-do-conhecimento.test.ts`): toda
   tabela declara a classe, a classe é uma das duas, e tabela de conhecimento carrega as 7
   colunas. **Não existe tabela sem classe** — deixar em branco não é neutro, é a forma mais
   comum de uma tabela de conhecimento passar batida.
3. **As cinco tabelas marcadas** `-- @classe: configuracao`, com o porquê escrito ao lado.

**Três decisões de projeto que vale registrar, porque cada uma evita um erro conhecido:**

- **`produced_by_kind` separado de `produced_by`.** A diferença entre *um humano afirmou* e
  *um modelo inferiu* é o que dá ou tira valor de uma evidência — e sumiria no dia em que
  agente e pessoa tivessem id do mesmo formato.
- **`confidence` não pode ter `default` nem `not null`.** Valor padrão inventado vira número
  na tela que ninguém escreveu. Ou o produtor sabe a confiança, ou a coluna fica nula e a
  tela mostra "não informado". Há um caso de teste vermelho só para isso.
- **Na dúvida, é `conhecimento`.** Errar para esse lado custa colunas a mais; errar para o
  outro custa descobrir na Fase 7 que nada é rastreável.

⚠️ **O limite da trava está escrito nela mesma:** ela lê SQL por expressão regular, não
entende SQL, e associa a declaração ao `create table` mais próximo. Por isso o passo "provar
que a trava morde" tem **quatro** casos vermelhos — é ele que prova, não a leitura do código.

⚠️ **E o alerta que sobrevive à revisão:** a trava garante que a coluna **exista**, não que
alguém **escreva** nela. Quem preenche cada uma precisa estar no mapa junto com o conector,
na mesma tarefa da Fase 2 — não depois.

---

## 19/08/2026, 18h45 — Book v2: chegou uma camada de produto inteira

O dono entregou o `CSI_Brasil_Book_v2_Completo_Claude.pdf` (versão 2.0, 19/08/2026) e pediu
para atualizar o projeto **antes de fazer qualquer coisa**.

**Método:** em vez de reler 40 páginas de olho, extraí os dois PDFs com
`pdftotext -layout -enc UTF-8` e **comparei**. O v1 continua preservado em
`docs/spec/BOOK-CSI-BRASIL-v1.md`, porque as decisões tomadas às 01h04 foram tomadas sobre
aquele texto — apagá-lo tornaria impossível saber sobre o que o dono decidiu.

**O que mudou, medido:**

| | v1 | v2 |
|---|---|---|
| Seções | 22 | **25** |
| Motores da arquitetura | **8** | **10** |
| Linhas de texto | 1.544 | 1.909 |

Os dois motores novos são **Investigation / Transform** e **Evidence & Cases Engine**.

**Contagem de termos, que mostra que não é reorganização de texto:**

| Termo | v1 | v2 |
|---|---|---|
| Playbook | 0 | **24** |
| Data Lineage | 0 | **9** |
| Transform Registry | 0 | **7** |
| Investigation Engine | 0 | **7** |
| Graph Workspace | 0 | **4** |
| Connector SDK | 0 | **3** |
| Evidence Vault | 3 | **9** |

**A origem da mudança:** o v2 assume o **Maltego** como referência funcional e traduz oito
capacidades dele em componentes do CSI — Canonical Entity Model, Transform Registry,
Investigation Playbooks, Graph Workspace, Data Hub + Connector SDK, Recursive Pivot Search,
Provenance Graph e Graph Collections.

**⚠️ O achado que muda trabalho, não só documentação.** O v2 escreve como regra de projeto:
*"o grafo não é decoração. Cada nó e cada aresta devem ser rastreáveis a evidência, fonte,
Transform, usuário/agente responsável, data e nível de confiança."* Isso **não é feature da
Fase 7** — é coluna obrigatória em toda tabela que guarde nó ou aresta, **desde a primeira**.
**O plano da Fase 1 foi escrito sobre o v1 e não tem isso.** Executá-lo como está faria o
modelo de dados nascer sem linhagem, e corrigir depois custaria a base inteira. Registrado
como risco 14 nas pendências.

**⚠️ E um conflito com uma decisão já tomada.** Em 01h04 o dono decidiu "plataforma que eu
opero, vendendo acesso" — e foi **essa** decisão que abriu a porta jurídica para usar o
`elite-programa` como referência, porque a licença da Awave permite faturar com o **serviço**,
não com o software. **O v2 acrescentou opção de `on-premise` / Enterprise deployment.** Se o
CSI Brasil também for instalado no cliente, ele vira software entregue e a porta fecha de
novo. Virou a pendência **2**, e não é detalhe de fase 10: muda o que pode ser usado como
referência **agora**.

**O que foi atualizado:** `docs/spec/BOOK-CSI-BRASIL.md` (v2, com o v1 preservado ao lado),
`docs/ROADMAP.md` (Fase 7 renomeada e reescopada, bloco novo do Investigation Engine),
`CLAUDE.md`, `docs/MAPA-DO-SISTEMA.md` (a regra de rastreabilidade na seção de travas) e
`docs/PENDENCIAS.md` (pendência 2 e risco 14).

📎 Consertado de passagem: a tabela "Esperando decisão sua" estava sem linha de cabeçalho e
não renderizava como tabela.

**Nenhum código foi escrito** — o pedido era atualizar as informações antes de qualquer
coisa, e as três decisões que destravam a Fase 1 continuam abertas.

---

## 19/08/2026, 01h10 — as duas decisões que destravaram a Fase 1

**O dono decidiu, e as duas respostas mudam o modelo de dados:**

1. **O CSI Brasil é uma plataforma que ele opera**, vendendo acesso — não é software
   entregue ao cliente. Consequência dura: **multi-tenancy desde a primeira tabela**.
2. **O domínio é inteligência corporativa brasileira** — CNPJ, PNCP e CVM prioritários. O
   protótipo de geopolítica entra só como desenho de tela.

Uma consequência lateral que vale registrar: como o produto é **serviço operado**, a licença
do `elite-programa` deixa de ser impeditiva — ela permite faturar com o serviço. A
recomendação técnica não muda (base extraída do Bahia Realty, `elite-programa` só como
referência de desenho), mas a porta jurídica que estava fechada agora está aberta.

**Escrito em seguida:** `docs/superpowers/plans/2026-08-19-fase-1-core-multi-tenant.md` — 5
tarefas com SQL e TypeScript prontos:

1. **A trava primeiro**, antes de qualquer tabela: um teste que lê as migrations e reprova
   tabela sem `organization_id`, sem RLS, ou com `FORCE ROW LEVEL SECURITY`. Regra que nasce
   depois da primeira violação já nasceu tarde.
2. Organizações, membros e os helpers `is_org_member` / `has_org_role` — com os dois
   ingredientes que evitam recursão infinita (`security definer` **e** `row_security = off`).
3. A matriz de papéis em lógica pura, testável sem banco, com **negar como padrão**.
4. Projetos — a primeira tabela de domínio, que serve de molde para todas as outras.
5. Monitores e versões de consulta, com **histórico imutável** de propósito: versão que pode
   ser reescrita não é histórico, e mudança de resultado seria atribuída ao mundo quando foi
   ao operador.

⚠️ Cada tarefa que aplica migration tem passo de **conferir no banco**, não de presumir. E o
passo do monitor avisa explicitamente que UPDATE que casa zero linhas **não devolve erro** —
é preciso contar as linhas afetadas.

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
