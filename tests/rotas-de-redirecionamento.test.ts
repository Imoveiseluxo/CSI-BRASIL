import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * As guardas mandam a pessoa para outra rota quando ela não pode ficar onde
 * está. **Se essa rota não existir, o resultado é 404** — a pior resposta
 * possível, porque não diz o que houve nem o que fazer.
 *
 * ⚠️ Isto não é hipótese. As guardas foram extraídas do Bahia Realty, onde a
 * tela de login mora em `/login`; aqui ela mora em `/entrar`. O redirecionamento
 * veio junto e apontava para uma página inexistente — **quem não estivesse
 * logado levava 404**. Só apareceu porque foi medido pela web, e não pela
 * leitura do código.
 */
const RAIZ = process.cwd();

/**
 * Resolve a rota contra a pasta `app/`, **entendendo segmento dinâmico**:
 * `/app/csi-brasil` mora em `app/app/[orgSlug]/`.
 *
 * ⚠️ A primeira versão desta função não sabia disso e reprovou uma rota que
 * existe. Trava que dá falso positivo é tão ruim quanto trava que não pega:
 * ensina a ignorar vermelho.
 */
function rotaExiste(rota: string): boolean {
  const partes = rota.split("/").filter(Boolean);

  function desce(dir: string, restante: string[]): boolean {
    if (restante.length === 0) {
      return existsSync(join(dir, "page.tsx")) || existsSync(join(dir, "route.ts"));
    }
    const [atual, ...resto] = restante as [string, ...string[]];

    const literal = join(dir, atual);
    if (existsSync(literal) && desce(literal, resto)) return true;

    // Qualquer pasta [param] casa com este segmento.
    if (!existsSync(dir)) return false;
    for (const filho of readdirSync(dir, { withFileTypes: true })) {
      if (!filho.isDirectory()) continue;
      if (!/^\[.+\]$/.test(filho.name)) continue;
      if (desce(join(dir, filho.name), resto)) return true;
    }
    return false;
  }

  return desce(join(RAIZ, "app"), partes);
}

function redirecionamentosDe(arquivo: string): string[] {
  const src = readFileSync(join(RAIZ, arquivo), "utf8");
  // Só os literais: `redirect(\`/app/${x}\`)` é dinâmico e não dá para conferir aqui.
  return [...src.matchAll(/redirect\("(\/[a-z0-9\-/]*)"\)/gi)].map((m) => m[1] as string);
}

describe("toda rota de redirecionamento das guardas existe", () => {
  it("lib/auth/guards.ts não manda ninguém para uma página que não existe", () => {
    const destinos = redirecionamentosDe("lib/auth/guards.ts");
    expect(
      destinos.length,
      "não achei redirecionamento nenhum — o teste ficaria vazio",
    ).toBeGreaterThan(0);

    const quebrados = destinos.filter((d) => !rotaExiste(d));
    expect(quebrados, `redirecionam para página inexistente: ${quebrados.join(", ")}`).toEqual([]);
  });

  it("lib/auth/actions.ts também não", () => {
    const quebrados = redirecionamentosDe("lib/auth/actions.ts").filter((d) => !rotaExiste(d));
    expect(quebrados, `redirecionam para página inexistente: ${quebrados.join(", ")}`).toEqual([]);
  });
});
