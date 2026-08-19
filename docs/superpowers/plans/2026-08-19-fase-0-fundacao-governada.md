# Fase 0 — Fundação Governada · Plano de Implementação

> **Para quem for executar:** use `superpowers:subagent-driven-development` ou
> `superpowers:executing-plans` para implementar tarefa por tarefa. Os passos usam caixinha
> (`- [ ]`) para acompanhamento.

**Objetivo:** deixar o repositório pronto para receber código — com portão de qualidade
funcionando, mapa vigiado por teste e as regras de segurança escritas — antes que exista
qualquer funcionalidade para defender.

**Arquitetura:** Next.js (App Router) + TypeScript strict, Biome para lint e formatação,
Vitest para testes, GitHub Actions como portão. Nenhuma dependência de banco nesta fase: a
Fase 0 não cria tabela, ela cria as regras que as tabelas vão obedecer.

**Stack:** Next.js · TypeScript · Biome · Vitest · GitHub Actions

**Spec:** `docs/spec/BOOK-CSI-BRASIL.md` — seção 22 (Fase 0: "PRD, arquitetura, threat model,
LGPD, design system, CI/CD → base governada") e seção 20 (segurança e LGPD).

## Restrições globais

Valem para toda tarefa deste plano e dos próximos.

- **Regra de interpretação (book):** em conflito entre velocidade e segurança, integridade da
  evidência, legalidade ou auditabilidade, **prevalecem** segurança, integridade, legalidade e
  auditabilidade.
- **TypeScript strict.** Nunca `any`. Nunca `@ts-ignore` sem comentário explicando.
- **PT-BR** em interface, documentação e mensagem; **inglês** em código.
- **Teste visto vermelho de propósito** antes de a tarefa ser dada por concluída.
- **Mapa atualizado na mesma tarefa** — `docs/MAPA-DO-SISTEMA.md`.
- **Relatório atualizado na mesma sessão** — `docs/RELATORIO-ATIVIDADES.md`.
- Fuso de referência: **America/Bahia (UTC−3)**.

---

## Arquivos desta fase

| Caminho | Responsabilidade |
|---|---|
| `package.json` | scripts `dev`, `build`, `test`, `lint`, `typecheck` |
| `tsconfig.json` | TypeScript strict |
| `biome.json` | lint e formatação |
| `vitest.config.ts` | configuração de teste, alias `@/` |
| `app/layout.tsx`, `app/page.tsx` | esqueleto mínimo que faz o build passar |
| `lib/.gitkeep` | a pasta que o teste-vigia observa |
| `tests/fundacao.test.ts` | prova que o portão roda |
| `tests/mapa-em-dia.test.ts` | trava: nada em `lib/` sem estar no mapa |
| `.github/workflows/portao.yml` | portão de qualidade em push e PR |
| `docs/THREAT-MODEL.md` | ameaças e o que cada uma exige do código |

---

### Tarefa 1: Esqueleto e portão de qualidade

**Arquivos:**
- Criar: `package.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`
- Criar: `app/layout.tsx`, `app/page.tsx`, `lib/.gitkeep`
- Teste: `tests/fundacao.test.ts`

**Interfaces:**
- Consome: nada — é a primeira tarefa.
- Produz: os scripts `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`,
  usados por todas as tarefas seguintes e pelo portão.

- [ ] **Passo 1: escrever o teste que falha**

`tests/fundacao.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * A Fase 0 não entrega funcionalidade — entrega a garantia de que o projeto tem
 * portão. Este teste é o que prova que o portão existe, e falha se alguém
 * remover um dos comandos de verificação do `package.json`.
 */
describe("fundação do projeto", () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };

  test.each(["typecheck", "lint", "test", "build"])(
    "o comando `%s` existe no package.json",
    (nome) => {
      expect(pkg.scripts?.[nome]).toBeTruthy();
    },
  );

  test("o TypeScript está em modo strict", () => {
    const tsconfig = readFileSync(join(process.cwd(), "tsconfig.json"), "utf8");
    expect(tsconfig).toMatch(/"strict"\s*:\s*true/);
  });

  test("a pasta lib/ existe — é ela que o teste-vigia do mapa observa", () => {
    expect(existsSync(join(process.cwd(), "lib"))).toBe(true);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `npx vitest run tests/fundacao.test.ts`
Esperado: FALHA — não existe `package.json` com esses comandos ainda.

- [ ] **Passo 3: criar o esqueleto**

`package.json`:

```json
{
  "name": "csi-brasil",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "format": "biome check --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Instalar: `npm install next react react-dom` e
`npm install -D typescript @types/react @types/node @biomejs/biome vitest`

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "incremental": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`vitest.config.ts`:

```ts
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, ".") } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

`app/layout.tsx`:

```tsx
export const metadata = { title: "CSI Brasil" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:

```tsx
export default function Home() {
  return <main>CSI Brasil</main>;
}
```

E `lib/.gitkeep` vazio.

- [ ] **Passo 4: rodar e ver passar**

Rodar: `npx vitest run tests/fundacao.test.ts`
Esperado: PASSA — 6 casos.

- [ ] **Passo 5: quebrar de propósito**

Renomear o script `typecheck` para `typecheck2` no `package.json`, rodar o teste de novo e
**confirmar que ele fica vermelho**. Depois desfazer.

Esperado: FALHA em "o comando `typecheck` existe no package.json".

- [ ] **Passo 6: commit**

```bash
git add package.json tsconfig.json biome.json vitest.config.ts app lib tests
git commit -m "chore: esqueleto do projeto e portao de qualidade"
```

---

### Tarefa 2: Teste-vigia do mapa

**Arquivos:**
- Criar: `tests/mapa-em-dia.test.ts`
- Modificar: `docs/MAPA-DO-SISTEMA.md` (seção 9)

**Interfaces:**
- Consome: a pasta `lib/` criada na Tarefa 1.
- Produz: a trava que obriga toda área nova de `lib/` a aparecer no mapa. Nenhuma tarefa
  futura precisa importar nada daqui — a trava age pelo portão.

**Por que agora, antes de existir código:** no projeto anterior do mesmo dono, a regra "mapa
atualizado na mesma tarefa" existia em três lugares e os três eram texto. Texto não trava
nada: quando o teste foi finalmente escrito, o mapa declarava 11 rotinas havendo 12 e 42
rotas havendo 43. Aqui a trava nasce **antes** do primeiro desvio possível.

- [ ] **Passo 1: escrever o teste que falha**

`tests/mapa-em-dia.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Trava da REGRA ZERO: nada existe em `lib/` sem estar declarado no mapa.
 *
 * ⚠️ O que este teste NÃO faz: dizer se a descrição no mapa ainda é verdade. Ele
 * garante que nada existe sem estar lá. Processo que mudou de comportamento
 * continua sendo responsabilidade de quem mexeu.
 */
const RAIZ = process.cwd();

function areasDeLib(): string[] {
  return readdirSync(join(RAIZ, "lib"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function mapa(): string {
  return readFileSync(join(RAIZ, "docs/MAPA-DO-SISTEMA.md"), "utf8");
}

describe("o mapa está em dia", () => {
  test("toda área de lib/ aparece no mapa", () => {
    const texto = mapa();
    const ausentes = areasDeLib().filter((area) => !texto.includes(`lib/${area}/`));
    expect(ausentes, `áreas de lib/ que faltam no mapa: ${ausentes.join(", ")}`).toEqual([]);
  });

  test("o mapa declara a seção de inventário que este teste vigia", () => {
    // Se alguém remover a seção, o teste acima passaria a valer sobre nada e
    // ficaria verde para sempre — o modo de falha mais perigoso de um vigia.
    expect(mapa()).toContain("## 9. Inventário de `lib/`");
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Rodar: `npx vitest run tests/mapa-em-dia.test.ts`
Esperado: FALHA — `lib/` só tem `.gitkeep`, então o primeiro caso passa, mas crie
temporariamente `lib/exemplo/` para confirmar que a trava morde:

```bash
mkdir -p lib/exemplo && npx vitest run tests/mapa-em-dia.test.ts
```

Esperado: FALHA com "áreas de lib/ que faltam no mapa: exemplo".

- [ ] **Passo 3: provar que declarar no mapa resolve**

Acrescentar na seção 9 do mapa a linha:

```markdown
| `lib/exemplo/` | Área de exemplo, criada só para provar a trava. Removida em seguida. |
```

Rodar de novo: `npx vitest run tests/mapa-em-dia.test.ts`
Esperado: PASSA.

- [ ] **Passo 4: desfazer o exemplo**

```bash
rm -rf lib/exemplo
```

E remover a linha do mapa. Rodar de novo — esperado: PASSA (nenhuma área, nada a declarar).

- [ ] **Passo 5: commit**

```bash
git add tests/mapa-em-dia.test.ts docs/MAPA-DO-SISTEMA.md
git commit -m "test: trava que impede area de lib/ existir fora do mapa"
```

---

### Tarefa 3: Portão no CI

**Arquivos:**
- Criar: `.github/workflows/portao.yml`

**Interfaces:**
- Consome: os scripts `typecheck`, `lint`, `test`, `build` da Tarefa 1.
- Produz: reprovação automática em push e pull request quando qualquer um deles falha.

- [ ] **Passo 1: criar o fluxo**

`.github/workflows/portao.yml`:

```yaml
name: portão

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verificar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

- [ ] **Passo 2: provar que o portão reprova**

Abrir um branch com um erro de tipo de propósito — por exemplo, em `app/page.tsx`:

```tsx
export default function Home() {
  const n: number = "texto";
  return <main>CSI Brasil {n}</main>;
}
```

Abrir o pull request e **confirmar que o portão fica vermelho**. Um portão que nunca reprovou
não é portão.

- [ ] **Passo 3: desfazer e confirmar verde**

Reverter o erro, empurrar de novo, confirmar que o portão fica verde.

- [ ] **Passo 4: commit**

```bash
git add .github/workflows/portao.yml
git commit -m "ci: portao de qualidade em push e PR"
```

---

### Tarefa 4: Threat model e nota de LGPD

**Arquivos:**
- Criar: `docs/THREAT-MODEL.md`

**Interfaces:**
- Consome: as regras absolutas do `CLAUDE.md`.
- Produz: a lista de ameaças que as fases seguintes precisam responder. Toda tarefa das
  Fases 1 e 2 que tocar coleta ou dado pessoal deve citar qual linha deste documento ela
  endereça.

**Por que é tarefa de código e não só de texto:** o book coloca o threat model na Fase 0 de
propósito. Recurso construído antes da ameaça ser nomeada tende a ser construído contra a
ameaça errada.

- [ ] **Passo 1: escrever o documento**

`docs/THREAT-MODEL.md` deve cobrir, uma seção por item, com **o que a ameaça exige do
código** em cada uma:

1. **Coleta fora dos termos** — fonte que proíbe robô, conteúdo atrás de autenticação,
   contorno de barreira técnica. Exigência: registro da base legal por fonte antes do
   primeiro acesso.
2. **Evidência não rastreável** — afirmação na tela sem endereço de origem. Exigência:
   proveniência gravada antes de qualquer processamento.
3. **Dado inventado exibido como real** — simulação, valor padrão, preenchimento automático.
   Exigência: rótulo na interface enquanto houver dado simulado.
4. **Vazamento entre clientes** — consulta que atravessa a fronteira do tenant. Exigência:
   `organization_id` e RLS em toda tabela de domínio, sem exceção.
5. **Dado pessoal sem base legal** — nome, telefone, CPF vindos de fonte aberta. Exigência:
   finalidade declarada, prazo de retenção e caminho de exclusão, conforme seção 20 do book.
6. **Injeção por conteúdo coletado** — texto de fonte externa chegando a um agente de IA como
   se fosse instrução. Exigência: conteúdo coletado é **dado**, nunca instrução; o agente
   recebe com fronteira explícita.
7. **Chave de serviço no navegador** — Exigência: segredo só em código de servidor.
8. **Exportação com fórmula** — célula de CSV começando com `=`, `+`, `-`, `@` executada no
   Excel de quem abre. Exigência: neutralização na exportação.

- [ ] **Passo 2: ligar ao mapa**

Acrescentar na seção 3 do mapa (`As travas que protegem a evidência`) a linha que aponta para
este documento, para que quem abrir o mapa encontre as ameaças.

- [ ] **Passo 3: commit**

```bash
git add docs/THREAT-MODEL.md docs/MAPA-DO-SISTEMA.md
git commit -m "docs: threat model da fase 0, com o que cada ameaca exige do codigo"
```

---

## Onde este plano para, e por quê

A Fase 0 termina aqui. As tarefas seguintes — multi-tenancy, workspace, RBAC, primeiro
conector — **dependem de duas decisões que ainda não foram tomadas**, registradas como itens
1 e 2 em `docs/PENDENCIAS.md`:

1. O CSI Brasil é **produto para vender**, **plataforma que você opera** ou **ferramenta
   interna**? Se for produto instalado no cliente, multi-tenancy some do modelo — e qualquer
   tabela criada antes dessa resposta tem chance de nascer errada.
2. **Inteligência corporativa brasileira** ou **geopolítica internacional**? Define quais
   conectores existem na Fase 2.

Escrever essas tarefas agora seria inventar requisito. O plano da Fase 1 nasce assim que as
duas respostas existirem.
