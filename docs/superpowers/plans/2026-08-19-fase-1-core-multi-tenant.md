# Fase 1 — Core Multi-Tenant · Plano de Implementação

> **Para quem for executar:** use `superpowers:subagent-driven-development` ou
> `superpowers:executing-plans`. Os passos usam caixinha (`- [ ]`) para acompanhamento.
> **Pré-requisito:** a Fase 0 (`2026-08-19-fase-0-fundacao-governada.md`) precisa estar
> concluída — esta fase depende do portão de qualidade e do teste-vigia do mapa.

**Objetivo:** entregar a fundação multi-tenant do CSI Brasil — organização, membros, papéis,
guardas de acesso, projetos e monitores — de forma que **nenhuma tabela de domínio possa
nascer sem `organization_id` e sem RLS**, e que essa garantia seja verificada por teste, não
por disciplina.

**Arquitetura:** PostgreSQL (Supabase) com Row Level Security em toda tabela de domínio.
A autorização mora no banco, não na aplicação: mesmo que uma consulta esqueça o filtro, a
regra do banco corta. As guardas em TypeScript são a segunda camada, não a primeira.

**Stack:** Next.js (App Router) · TypeScript strict · Supabase (Postgres + Auth + RLS) ·
Vitest · Zod

**Spec:** `docs/spec/BOOK-CSI-BRASIL.md` — seção 22 (Fase 1: "Auth, workspace, projetos,
monitores, users/RBAC → produto navegável"), seção 17 (modelo de dados: Tenant, Workspace,
User, Role, Permission, Project, Monitor, QueryVersion) e seção 20 (segurança e LGPD).

## Restrições globais

- **Decisão do dono, 19/08/2026:** o CSI Brasil é **plataforma operada pelo dono**. Portanto
  **multi-tenancy é obrigatória desde a primeira tabela** — `organization_id` + RLS, sem
  exceção.
- **Domínio:** inteligência corporativa **brasileira**. Nada de escopo geopolítico.
- **Nunca `FORCE ROW LEVEL SECURITY`** — causa recursão infinita com helpers `security
  definer`. `ENABLE` é suficiente.
- **Helpers de acesso usam `security definer` + `set row_security = off`** — sem o segundo,
  a consulta interna reaplica a RLS da própria tabela e entra em recursão.
- **Policies permissivas combinam com OU.** Acrescentar policy restritiva ao lado de uma
  ampla **não restringe nada** — a ampla precisa ser derrubada e recriada.
- **TypeScript strict**, nunca `any`. **PT-BR** em interface e documentação, **inglês** em código.
- **Teste visto vermelho de propósito** antes de a tarefa ser dada por concluída.
- **Mapa atualizado na mesma tarefa.**
- 🆕 **Rastreabilidade (Book v2, 19/08/2026).** Regra escrita em caixa alta no book: *"o
  grafo não é decoração. Cada nó e cada aresta devem ser rastreáveis a evidência, fonte,
  Transform, usuário/agente responsável, data e nível de confiança."* Toda tabela que guarde
  **conhecimento derivado** — entidade, relação, fato extraído, evento, evidência — nasce com
  o conjunto de colunas de procedência da Tarefa 1b. **Toda migration declara a classe da
  tabela**, e a trava reprova quem não declarar.

---

## ⚠️ Revisão de 19/08/2026 — o que o Book v2 mudou neste plano

Este plano foi escrito sobre o **Book v1**. O v2 acrescentou o **Investigation Engine** e a
regra de rastreabilidade acima. A revisão foi feita, e a conclusão é mais estreita do que
parece à primeira vista:

**As cinco tabelas desta fase NÃO recebem colunas de procedência** — e isso é decisão, não
esquecimento. `organizations`, `memberships`, `projects`, `monitors` e `query_versions` são
**configuração de trabalho**: elas registram o que o operador pediu, não o que o sistema
descobriu no mundo. Não são nó, aresta nem fato extraído. Pôr `fonte`, `evidência` e
`confiança` nelas encheria o banco de coluna nula que ninguém escreve — que é exatamente o
**risco 13** desta lista (*"campo que ninguém preenche"*), e foi o erro que no projeto
anterior deixou painéis e alertas pendurados em campos mortos.

**O que a regra exige desta fase é o contrato e a trava**, pelo mesmo motivo que a Tarefa 1
existe: *regra que nasce depois da primeira violação já nasceu tarde*. A primeira tabela de
conhecimento aparece na Fase 2 (documentos coletados) e a Fase 7 inteira depende disso. Se o
molde não existir antes, ele nasce por improviso na pressa do primeiro conector.

Por isso a revisão acrescenta **uma tarefa** (1b) e marca a classe das tabelas nas Tarefas 4
e 5. Nada mais muda.

---

## Arquivos desta fase

| Caminho | Responsabilidade |
|---|---|
| `supabase/migrations/0001_organizations.sql` | organizações e membros, com RLS e helpers |
| `supabase/migrations/0002_projects.sql` | projetos, primeira tabela de domínio |
| `supabase/migrations/0003_monitors.sql` | monitores e versões de consulta |
| `lib/auth/guards.ts` | `requireOrgMember`, `requireOrgRole` |
| `lib/auth/permissions.ts` | matriz de papéis — lógica pura, testável sem banco |
| `lib/orgs/queries.ts` | leitura de organização e membros |
| `lib/projects/queries.ts` · `lib/projects/actions.ts` | projetos |
| `lib/monitors/queries.ts` · `lib/monitors/actions.ts` | monitores |
| `tests/toda-tabela-e-multi-tenant.test.ts` | **a trava**: nenhuma tabela sem `organization_id` e RLS |
| `tests/rastreabilidade-do-conhecimento.test.ts` | 🆕 **a segunda trava**: tabela de conhecimento sem procedência não entra |
| `docs/CONTRATO-DE-PROCEDENCIA.md` | 🆕 o conjunto de colunas obrigatório, e o que cada uma responde |
| `tests/permissoes.test.ts` | a matriz de papéis |

---

### Tarefa 1: A trava que impede tabela sem tenant

**Faz-se primeiro, antes de existir qualquer tabela.** Uma regra que nasce depois da primeira
violação já nasceu tarde.

**Arquivos:**
- Criar: `tests/toda-tabela-e-multi-tenant.test.ts`
- Criar: `supabase/migrations/.gitkeep`

**Interfaces:**
- Consome: nada.
- Produz: a garantia, verificada no portão, de que toda migration que cria tabela no schema
  `public` declara `organization_id` e habilita RLS. Todas as tarefas seguintes dependem dela
  para passar no portão.

- [ ] **Passo 1: escrever o teste**

`tests/toda-tabela-e-multi-tenant.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * A regra dura deste projeto: toda tabela de domínio tem `organization_id` e RLS
 * habilitada. Regra escrita em documento é texto, e texto não trava nada — por
 * isso ela vive aqui, no portão.
 *
 * ⚠️ Este teste lê SQL, não o banco. Ele impede que uma migration entre errada;
 * não garante que o banco esteja no estado que as migrations descrevem. Conferir
 * o banco é tarefa de quem aplica.
 */
const DIR = join(process.cwd(), "supabase/migrations");

/** Tabelas de infraestrutura que legitimamente não pertencem a uma organização. */
const ISENTAS = new Set(["organizations"]);

function migrations(): { arquivo: string; sql: string }[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ arquivo: f, sql: readFileSync(join(DIR, f), "utf8") }));
}

/** Nomes de tabela criadas no schema public por uma migration. */
function tabelasCriadas(sql: string): string[] {
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-z_0-9]+)["']?/gi;
  return [...sql.matchAll(re)].map((m) => m[1] as string);
}

describe("toda tabela de domínio é multi-tenant", () => {
  test("nenhuma tabela nasce sem organization_id", () => {
    const faltando: string[] = [];
    for (const { arquivo, sql } of migrations()) {
      for (const tabela of tabelasCriadas(sql)) {
        if (ISENTAS.has(tabela)) continue;
        // O organization_id precisa estar no MESMO bloco create table.
        const bloco = sql.slice(sql.toLowerCase().indexOf(`create table`));
        if (!bloco.includes("organization_id")) faltando.push(`${arquivo}:${tabela}`);
      }
    }
    expect(faltando, `tabelas sem organization_id: ${faltando.join(", ")}`).toEqual([]);
  });

  test("nenhuma tabela nasce sem RLS habilitada", () => {
    const faltando: string[] = [];
    for (const { arquivo, sql } of migrations()) {
      const baixo = sql.toLowerCase();
      for (const tabela of tabelasCriadas(sql)) {
        const esperado = `alter table public.${tabela} enable row level security`;
        if (!baixo.includes(esperado)) faltando.push(`${arquivo}:${tabela}`);
      }
    }
    expect(faltando, `tabelas sem RLS: ${faltando.join(", ")}`).toEqual([]);
  });

  test("ninguém usa FORCE ROW LEVEL SECURITY", () => {
    // FORCE + helper security definer = recursão infinita. ENABLE é suficiente.
    const culpados = migrations()
      .filter(({ sql }) => /force\s+row\s+level\s+security/i.test(sql))
      .map(({ arquivo }) => arquivo);
    expect(culpados, `migrations com FORCE RLS: ${culpados.join(", ")}`).toEqual([]);
  });
});
```

- [ ] **Passo 2: rodar — passa vazio**

Rodar: `npx vitest run tests/toda-tabela-e-multi-tenant.test.ts`
Esperado: PASSA (não há migration ainda). Isso é esperado e não prova nada — o passo 3 prova.

- [ ] **Passo 3: provar que a trava morde**

Criar `supabase/migrations/9999_teste_da_trava.sql` com uma tabela errada de propósito:

```sql
create table public.exemplo_errado (
  id uuid primary key default gen_random_uuid()
);
```

Rodar de novo.
Esperado: **FALHA** em dois casos — "tabelas sem organization_id: 9999_teste_da_trava.sql:exemplo_errado" e "tabelas sem RLS".

- [ ] **Passo 4: apagar o arquivo de teste da trava**

```bash
rm supabase/migrations/9999_teste_da_trava.sql
```

Rodar de novo — esperado: PASSA.

- [ ] **Passo 5: commit**

```bash
git add tests/toda-tabela-e-multi-tenant.test.ts supabase/migrations/.gitkeep
git commit -m "test: trava que impede tabela nascer sem organization_id e RLS"
```

---

### Tarefa 1b: A trava da rastreabilidade 🆕

**Também antes de existir qualquer tabela.** Mesmo argumento da Tarefa 1: a primeira tabela
de conhecimento nasce na Fase 2, e um molde que só é inventado na pressa do primeiro conector
nasce torto.

**Arquivos:**
- Criar: `docs/CONTRATO-DE-PROCEDENCIA.md`
- Criar: `tests/rastreabilidade-do-conhecimento.test.ts`

**Interfaces:**
- Consome: nada.
- Produz: a garantia de que toda tabela **declara sua classe**, e que tabela de conhecimento
  carrega as colunas que respondem *de onde veio isto*.

- [ ] **Passo 1: escrever o contrato**

`docs/CONTRATO-DE-PROCEDENCIA.md`:

```markdown
# Contrato de procedência

O Book v2 escreve como regra de projeto: *"o grafo não é decoração. Cada nó e cada aresta
devem ser rastreáveis a evidência, fonte, Transform, usuário/agente responsável, data e
nível de confiança."*

## Duas classes de tabela, declaradas explicitamente

Toda migration que cria tabela declara a classe numa linha de comentário **acima** do
`create table`:

    -- @classe: configuracao
    -- @classe: conhecimento

**`configuracao`** — registra o que o operador pediu: organizações, membros, projetos,
monitores, versões de consulta, preferências. Não descreve o mundo, descreve o nosso
próprio sistema.

**`conhecimento`** — registra o que o sistema descobriu ou derivou de uma fonte: documento
coletado, entidade, relação, fato extraído, evento, evidência, resultado de Transform.

⚠️ **Não existe terceira opção, e não existe tabela sem classe.** Deixar em branco não é
neutro: é a forma mais comum de uma tabela de conhecimento passar batida. A trava reprova.

⚠️ **Na dúvida, é `conhecimento`.** O custo de errar para esse lado são colunas a mais numa
tabela; o custo de errar para o outro é descobrir na Fase 7 que nada é rastreável.

## As colunas obrigatórias em `conhecimento`

| Coluna | Pergunta que responde | Tipo |
|---|---|---|
| `source_id` | De qual **fonte** veio? | `uuid` (referência) |
| `evidence_id` | Qual **artefato guardado** sustenta isto? | `uuid` (referência) |
| `transform_id` | Qual **operação** produziu isto? `null` = coleta direta | `uuid` (referência) |
| `produced_by_kind` | **Humano, agente ou rotina?** | `text` com CHECK |
| `produced_by` | **Quem**, nominalmente | `uuid` (usuário ou agente) |
| `produced_at` | **Quando** | `timestamptz` |
| `confidence` | **Quanto se confia**, de 0 a 1 | `numeric(3,2)` com CHECK |

⚠️ **`produced_by_kind` existe separado de `produced_by` de propósito.** Sem ele, "quem
afirmou isto" some no dia em que um agente e uma pessoa tiverem id do mesmo formato — e a
diferença entre um humano ter afirmado e um modelo ter inferido é justamente o que dá ou
tira valor de uma evidência.

⚠️ **`confidence` não pode ser `not null` com default.** Valor padrão inventado vira número
na tela que ninguém escreveu — o risco 13 desta lista. Ou o produtor sabe a confiança e
escreve, ou a coluna fica nula e a tela mostra "não informado".

## O que este contrato NÃO cobre ainda

Imutabilidade de evidência (nada de UPDATE/DELETE em tabela de evidência), o
`Transform Registry` e o `Provenance Graph` são da Fase 7. Este contrato garante que os
campos existam desde a primeira linha, para que a Fase 7 tenha o que ligar.
```

- [ ] **Passo 2: escrever o teste**

`tests/rastreabilidade-do-conhecimento.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Segunda trava do projeto (Book v2): tabela que guarda conhecimento derivado
 * precisa dizer de onde aquilo veio.
 *
 * ⚠️ A trava age sobre a DECLARAÇÃO, não sobre adivinhação de nome. Um teste que
 * tentasse deduzir a classe pelo nome da tabela erraria nos dois sentidos e daria
 * falsa segurança — pior que não ter trava.
 *
 * ⚠️ Limite conhecido: a leitura é por expressão regular sobre o SQL, e associa a
 * declaração ao `create table` MAIS PRÓXIMO abaixo dela. Ela não entende SQL de
 * verdade. Por isso o passo "provar que a trava morde" tem quatro casos, e é ele
 * — não a leitura deste código — que prova que a trava funciona.
 */
const DIR = join(process.cwd(), "supabase/migrations");

const COLUNAS_DE_PROCEDENCIA = [
  "source_id",
  "evidence_id",
  "transform_id",
  "produced_by_kind",
  "produced_by",
  "produced_at",
  "confidence",
] as const;

type Tabela = { arquivo: string; nome: string; classe: string | null; corpo: string };

function migrations(): { arquivo: string; sql: string }[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ arquivo: f, sql: readFileSync(join(DIR, f), "utf8") }));
}

/**
 * Cada `create table` com a classe declarada acima dele e o corpo entre parênteses.
 * A classe vale para o PRÓXIMO create table — declarar uma vez no topo do arquivo
 * não classifica as tabelas seguintes, de propósito.
 */
function tabelas(sql: string, arquivo: string): Tabela[] {
  const achados: Tabela[] = [];
  const re =
    /(?:--\s*@classe:\s*(\w+)\s*\n(?:[^\n]*\n)*?)?create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-z_0-9]+)["']?\s*\(([\s\S]*?)\n\)\s*;/gi;
  for (const m of sql.matchAll(re)) {
    achados.push({
      arquivo,
      classe: (m[1] ?? null) as string | null,
      nome: m[2] as string,
      corpo: m[3] as string,
    });
  }
  return achados;
}

function todas(): Tabela[] {
  return migrations().flatMap(({ arquivo, sql }) => tabelas(sql, arquivo));
}

describe("rastreabilidade do conhecimento", () => {
  test("toda tabela declara a classe", () => {
    const semClasse = todas()
      .filter((t) => t.classe === null)
      .map((t) => `${t.arquivo}:${t.nome}`);
    expect(
      semClasse,
      `tabelas sem "-- @classe:" acima do create table: ${semClasse.join(", ")}`,
    ).toEqual([]);
  });

  test("a classe declarada é uma das duas conhecidas", () => {
    const invalidas = todas()
      .filter((t) => t.classe !== null && t.classe !== "configuracao" && t.classe !== "conhecimento")
      .map((t) => `${t.arquivo}:${t.nome}=${t.classe}`);
    expect(invalidas, `classe desconhecida: ${invalidas.join(", ")}`).toEqual([]);
  });

  test("tabela de conhecimento carrega as colunas de procedência", () => {
    const faltando: string[] = [];
    for (const t of todas()) {
      if (t.classe !== "conhecimento") continue;
      for (const coluna of COLUNAS_DE_PROCEDENCIA) {
        if (!new RegExp(`\\b${coluna}\\b`).test(t.corpo)) {
          faltando.push(`${t.arquivo}:${t.nome} sem ${coluna}`);
        }
      }
    }
    expect(faltando, faltando.join(" | ")).toEqual([]);
  });

  test("confidence não nasce com default — número inventado vira número na tela", () => {
    const culpadas: string[] = [];
    for (const t of todas()) {
      if (t.classe !== "conhecimento") continue;
      const linha = t.corpo.split("\n").find((l) => /\bconfidence\b/.test(l)) ?? "";
      if (/default/i.test(linha) || /not\s+null/i.test(linha)) {
        culpadas.push(`${t.arquivo}:${t.nome}`);
      }
    }
    expect(
      culpadas,
      `confidence com default ou not null: ${culpadas.join(", ")}`,
    ).toEqual([]);
  });
});
```

- [ ] **Passo 3: provar que a trava morde — os quatro casos**

⚠️ **Passa vazio não prova nada.** Criar `supabase/migrations/9999_teste_da_trava.sql` e
rodar **uma vez para cada caso**, conferindo que falha o teste certo:

| Conteúdo do arquivo | Deve falhar em |
|---|---|
| `create table public.a (id uuid primary key);` sem comentário | "toda tabela declara a classe" |
| `-- @classe: qualquer` acima | "a classe declarada é uma das duas" |
| `-- @classe: conhecimento` com só `id` e `organization_id` | "carrega as colunas de procedência" (7 faltas) |
| `-- @classe: conhecimento` completa, mas `confidence numeric(3,2) not null default 1` | "confidence não nasce com default" |

⚠️ O quarto caso é o que mais importa: `default 1` é o jeito mais natural de escrever, e
produz exatamente o campo que ninguém preencheu com um número que parece medido.

- [ ] **Passo 4: apagar o arquivo de teste**

```bash
rm supabase/migrations/9999_teste_da_trava.sql
```

Rodar de novo — esperado: PASSA.

- [ ] **Passo 5: registrar no mapa**

Na seção 3 (`As travas que protegem a evidência`), acrescentar a linha da trava com **o que
ela cobre e o que não cobre**: cobre migration que entra no repositório; **não** cobre o
estado do banco, nem garante que alguém escreva nas colunas. Quem preenche é a Fase 2.

- [ ] **Passo 6: commit**

```bash
git add docs/CONTRATO-DE-PROCEDENCIA.md tests/rastreabilidade-do-conhecimento.test.ts docs/MAPA-DO-SISTEMA.md
git commit -m "test: trava de procedencia — tabela de conhecimento diz de onde veio"
```

---

### Tarefa 2: Organizações, membros e os helpers de acesso

**Arquivos:**
- Criar: `supabase/migrations/0001_organizations.sql`
- Modificar: `docs/MAPA-DO-SISTEMA.md` (seção 13)

**Interfaces:**
- Consome: a trava da Tarefa 1.
- Produz: as tabelas `organizations` e `memberships`, e as funções
  `public.is_org_member(uuid) → boolean` e `public.has_org_role(uuid, text[]) → boolean`,
  usadas por **todas** as policies das tarefas seguintes.

- [ ] **Passo 1: escrever a migration**

`supabase/migrations/0001_organizations.sql`:

```sql
-- Fundação multi-tenant do CSI Brasil.
--
-- Decisão do dono (19/08/2026): o produto é uma PLATAFORMA OPERADA, vendendo
-- acesso. Logo, tenant é a primeira entidade do modelo, como o book manda, e
-- toda tabela de domínio daqui em diante carrega organization_id + RLS.

-- @classe: configuracao
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- @classe: configuracao
create table public.memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('owner','admin','analyst','viewer')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
alter table public.memberships enable row level security;

-- ⚠️ `security definer` + `set row_security = off` são os DOIS necessários.
-- Sem o segundo, a consulta interna reaplica a RLS de memberships e entra em
-- recursão infinita. E NUNCA usar FORCE ROW LEVEL SECURITY junto: mesma causa.
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(p_org uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.role = any(p_roles)
  );
$$;

revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.has_org_role(uuid, text[]) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

create policy "membro lê a própria organização" on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

create policy "membro lê os membros da própria organização" on public.memberships
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "dono e admin gerenciam membros" on public.memberships
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']))
  with check (public.has_org_role(organization_id, array['owner','admin']));

create index on public.memberships (organization_id, user_id);
```

- [ ] **Passo 2: rodar a trava**

Rodar: `npx vitest run tests/toda-tabela-e-multi-tenant.test.ts`
Esperado: PASSA. `organizations` está na lista de isentas (ela **é** o tenant);
`memberships` tem `organization_id` e RLS.

- [ ] **Passo 3: aplicar e conferir no banco**

Aplicar a migration no projeto Supabase e conferir com esta consulta — **não presuma que
aplicou**:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('organizations','memberships');
```

Esperado: duas linhas, ambas com `rowsecurity = true`.

- [ ] **Passo 4: registrar no mapa**

Acrescentar na seção 13 do mapa:

```markdown
| `organizations` | `lib/orgs/` | é o próprio tenant — isenta de `organization_id` |
| `memberships`   | `lib/orgs/` | ✅ `organization_id` + RLS |
```

- [ ] **Passo 5: commit**

```bash
git add supabase/migrations/0001_organizations.sql docs/MAPA-DO-SISTEMA.md
git commit -m "feat(db): organizacoes, membros e helpers de acesso com RLS"
```

---

### Tarefa 3: A matriz de papéis, em lógica pura

**Arquivos:**
- Criar: `lib/auth/permissions.ts`
- Teste: `tests/permissoes.test.ts`

**Interfaces:**
- Consome: os papéis definidos na Tarefa 2 (`owner`, `admin`, `analyst`, `viewer`).
- Produz: `podeNaSecao(papel: Papel, secao: Secao, acao: Acao): boolean` e os tipos `Papel`,
  `Secao`, `Acao`. A Tarefa 4 usa isso dentro das guardas.

**Por que separado do banco:** decisão de permissão é regra de negócio, e regra de negócio se
testa sem subir banco. A RLS continua sendo a primeira camada; isto é a segunda.

- [ ] **Passo 1: escrever o teste**

`tests/permissoes.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { type Papel, podeNaSecao } from "@/lib/auth/permissions";

describe("matriz de papéis", () => {
  test("viewer lê e não escreve", () => {
    expect(podeNaSecao("viewer", "projetos", "ler")).toBe(true);
    expect(podeNaSecao("viewer", "projetos", "escrever")).toBe(false);
  });

  test("analyst escreve projeto e monitor, mas não mexe em membros", () => {
    expect(podeNaSecao("analyst", "projetos", "escrever")).toBe(true);
    expect(podeNaSecao("analyst", "monitores", "escrever")).toBe(true);
    expect(podeNaSecao("analyst", "membros", "escrever")).toBe(false);
  });

  test("admin e owner mexem em membros", () => {
    for (const papel of ["admin", "owner"] as Papel[]) {
      expect(podeNaSecao(papel, "membros", "escrever")).toBe(true);
    }
  });

  test("papel desconhecido não recebe nada — o padrão é negar", () => {
    // Se um papel novo entrar no banco sem entrar aqui, ele fica SEM acesso.
    // O contrário — herdar permissão por omissão — é como acesso indevido nasce.
    expect(podeNaSecao("intruso" as Papel, "projetos", "ler")).toBe(false);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `npx vitest run tests/permissoes.test.ts`
Esperado: FALHA — o módulo não existe.

- [ ] **Passo 3: implementar**

`lib/auth/permissions.ts`:

```ts
export type Papel = "owner" | "admin" | "analyst" | "viewer";
export type Secao = "projetos" | "monitores" | "membros";
export type Acao = "ler" | "escrever";

/**
 * Quem pode o quê. O padrão é NEGAR: papel que não estiver aqui não recebe
 * nada. Herdar permissão por omissão é como acesso indevido nasce.
 *
 * Esta é a segunda camada. A primeira é a RLS no banco — se as duas
 * discordarem, quem manda é o banco, e o bug está aqui.
 */
const MATRIZ: Record<Papel, Record<Secao, Acao[]>> = {
  owner:   { projetos: ["ler", "escrever"], monitores: ["ler", "escrever"], membros: ["ler", "escrever"] },
  admin:   { projetos: ["ler", "escrever"], monitores: ["ler", "escrever"], membros: ["ler", "escrever"] },
  analyst: { projetos: ["ler", "escrever"], monitores: ["ler", "escrever"], membros: ["ler"] },
  viewer:  { projetos: ["ler"],             monitores: ["ler"],             membros: ["ler"] },
};

export function podeNaSecao(papel: Papel, secao: Secao, acao: Acao): boolean {
  return MATRIZ[papel]?.[secao]?.includes(acao) ?? false;
}
```

- [ ] **Passo 4: rodar e ver passar**

Rodar: `npx vitest run tests/permissoes.test.ts`
Esperado: PASSA — 5 casos.

- [ ] **Passo 5: quebrar de propósito**

Trocar `viewer.projetos` para `["ler", "escrever"]`, rodar, **confirmar vermelho** em
"viewer lê e não escreve". Depois desfazer.

- [ ] **Passo 6: commit**

```bash
git add lib/auth/permissions.ts tests/permissoes.test.ts
git commit -m "feat(auth): matriz de papeis, com negar como padrao"
```

---

### Tarefa 4: Projetos — a primeira tabela de domínio

**Arquivos:**
- Criar: `supabase/migrations/0002_projects.sql`
- Modificar: `docs/MAPA-DO-SISTEMA.md` (seções 9 e 13)

**Interfaces:**
- Consome: `public.is_org_member` e `public.has_org_role` da Tarefa 2.
- Produz: a tabela `projects`, e o **padrão de tabela org-scoped** que toda tabela seguinte
  copia.

- [ ] **Passo 1: escrever a migration**

`supabase/migrations/0002_projects.sql`:

```sql
-- Projeto: o contexto de trabalho dentro de uma organização (seção 17 do book).
-- Esta é a PRIMEIRA tabela de domínio, e serve de molde para todas as outras.

-- @classe: configuracao
-- Projeto é o que o operador organizou, não o que o sistema descobriu no mundo —
-- por isso NÃO leva colunas de procedência. Ver docs/CONTRATO-DE-PROCEDENCIA.md.
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.projects enable row level security;

create policy "membro lê projeto da própria organização" on public.projects
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "analista ou mais escreve projeto" on public.projects
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','analyst']))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']));

create index on public.projects (organization_id, created_at desc);
```

- [ ] **Passo 2: rodar a trava**

Rodar: `npx vitest run tests/toda-tabela-e-multi-tenant.test.ts tests/rastreabilidade-do-conhecimento.test.ts`
Esperado: PASSA nas **duas** travas — tem `organization_id`, tem RLS, e declara
`@classe: configuracao`.

- [ ] **Passo 3: aplicar e conferir que a RLS realmente corta**

Aplicar e, com dois usuários de organizações diferentes, conferir que cada um enxerga só o
próprio projeto:

```sql
-- como usuário da org A, depois de criar um projeto em cada org:
select count(*) from public.projects;
```

Esperado: conta **só** os da organização A. Se contar os dois, a RLS não está cortando —
e nada mais desta fase pode seguir antes disso ser resolvido.

- [ ] **Passo 4: registrar no mapa**

Seção 13: `| projects | lib/projects/ | ✅ organization_id + RLS |`
Seção 9: `| lib/projects/ | Projetos: o contexto de trabalho dentro da organização. |`

- [ ] **Passo 5: commit**

```bash
git add supabase/migrations/0002_projects.sql docs/MAPA-DO-SISTEMA.md
git commit -m "feat(db): projetos, primeira tabela de dominio org-scoped"
```

---

### Tarefa 5: Monitores e versões de consulta

**Arquivos:**
- Criar: `supabase/migrations/0003_monitors.sql`
- Modificar: `docs/MAPA-DO-SISTEMA.md` (seções 9 e 13)

**Interfaces:**
- Consome: `public.projects` da Tarefa 4 e os helpers da Tarefa 2.
- Produz: `monitors` e `query_versions` — o monitor é a consulta persistente que a Fase 2 vai
  executar contra as fontes.

**Por que `query_versions` separada:** o book lista `QueryVersion` como entidade própria. O
motivo é auditabilidade: quando o resultado de um monitor muda, é preciso saber **se a
consulta mudou** — senão a mudança no resultado é atribuída ao mundo quando foi ao operador.

- [ ] **Passo 1: escrever a migration**

`supabase/migrations/0003_monitors.sql`:

```sql
-- Monitor: consulta persistente que observa fontes ao longo do tempo.
-- Cada alteração na consulta vira uma VERSÃO nova, nunca uma sobrescrita:
-- sem isso, mudança de resultado é atribuída ao mundo quando foi ao operador.

-- @classe: configuracao
create table public.monitors (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id      uuid not null references public.projects(id) on delete cascade,
  name            text not null,
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
alter table public.monitors enable row level security;

-- @classe: configuracao
-- ⚠️ Fronteira sutil: query_versions é histórico do que o OPERADOR pediu, não do
-- que o mundo respondeu. O RESULTADO da consulta, que a Fase 2 vai guardar, é
-- `conhecimento` e leva procedência. Confundir os dois é o erro fácil aqui.
create table public.query_versions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  monitor_id      uuid not null references public.monitors(id) on delete cascade,
  version         integer not null,
  expression      text not null,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  unique (monitor_id, version)
);
alter table public.query_versions enable row level security;

create policy "membro lê monitor da própria organização" on public.monitors
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "analista ou mais escreve monitor" on public.monitors
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin','analyst']))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']));

create policy "membro lê versão de consulta da própria organização" on public.query_versions
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "analista ou mais cria versão de consulta" on public.query_versions
  for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']));

create index on public.monitors (organization_id, project_id);
create index on public.query_versions (monitor_id, version desc);
```

⚠️ Repare que `query_versions` **não** tem policy de UPDATE nem DELETE, de propósito: versão
é histórico, e histórico que pode ser reescrito não é histórico.

- [ ] **Passo 2: rodar a trava**

Rodar: `npx vitest run tests/toda-tabela-e-multi-tenant.test.ts tests/rastreabilidade-do-conhecimento.test.ts`
Esperado: PASSA nas duas travas — as duas tabelas têm `organization_id`, RLS e classe
declarada.

- [ ] **Passo 3: conferir que versão não pode ser reescrita**

Aplicar e, como analista, tentar:

```sql
update public.query_versions set expression = 'alterado' where id = '<um id>';
```

Esperado: **zero linhas afetadas**. ⚠️ O Postgres **não devolve erro** nesse caso — parece
que deu certo. Conferir contando as linhas afetadas, não pelo status do comando.

- [ ] **Passo 4: registrar no mapa**

Seções 9 e 13, e acrescentar `monitors` na seção 1 (etapa de descoberta), já que é o monitor
que dispara a coleta na Fase 2.

- [ ] **Passo 5: commit**

```bash
git add supabase/migrations/0003_monitors.sql docs/MAPA-DO-SISTEMA.md
git commit -m "feat(db): monitores e versoes de consulta, com historico imutavel"
```

---

## O que fica para a Fase 2

Guardas em TypeScript (`requireOrgMember`, `requireOrgRole`), as telas do workspace e as
Server Actions de projeto e monitor entram assim que houver autenticação configurada no
Supabase — que é decisão de infraestrutura, não de código, e depende do projeto Supabase
existir.

A Fase 2 começa com **um** conector real. Pela decisão do domínio (inteligência corporativa
brasileira), o candidato natural é a fonte pública de CNPJ ou o PNCP — item 4 das pendências.

🆕 **E a Fase 2 cria a primeira tabela `@classe: conhecimento`** — o documento coletado. É
ali que o contrato da Tarefa 1b deixa de ser teoria: a tabela nasce com `source_id`,
`evidence_id`, `transform_id`, `produced_by_kind`, `produced_by`, `produced_at` e
`confidence`, e a trava reprova se faltar qualquer um.

⚠️ **A trava garante que a coluna exista, não que alguém escreva nela.** Essa é a diferença
que no projeto anterior custou caro: três campos de atendimento existiam, nenhuma linha de
código escrevia neles, e painéis e alertas ficaram pendurados em número que nunca saiu de
zero. **Quem preenche cada coluna de procedência precisa estar escrito no mapa junto com o
conector**, na mesma tarefa — não depois.
