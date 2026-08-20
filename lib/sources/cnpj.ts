import { createHash } from "node:crypto";
import { logError } from "@/lib/logger";
import { type Provedor, provedoresUtilizaveis } from "./cnpj-provedores";
import { digitosDoCnpj } from "./cnpj-validacao";
import { destinoPermitido } from "./destino-permitido";

/**
 * Consulta um CNPJ e devolve o **artefato cru** mais de onde ele veio.
 *
 * ⚠️ Este arquivo **não interpreta** a resposta. Quem interpreta é
 * `cnpj-normaliza.ts`, separado de propósito: a interpretação é o pedaço que
 * mais muda quando a fonte muda de formato, e precisa ser testável sem rede.
 */

export type Coleta = {
  cnpj: string;
  provedor: Provedor;
  url: string;
  /** A resposta como veio. Nada de campo derivado aqui. */
  conteudo: unknown;
  /** O que permite afirmar depois que o artefato não mudou. */
  hash: string;
  /**
   * Quem falhou ANTES deste provedor responder, e por quê.
   *
   * ⚠️ Existe porque provedor que falha em silêncio é invisível. Sem isto, o
   * primeiro da lista podia estar fora do ar há meses e ninguém saberia — a
   * coleta funcionaria pelo segundo, e o painel ficaria verde. É a mesma classe
   * de erro que no projeto anterior manteve uma campanha parada dois dias.
   */
  recusasAnteriores: string[];
};

export type ResultadoColeta = { ok: true; coleta: Coleta } | { ok: false; motivo: string };

/** Hash estável do artefato — chaves ordenadas, para o mesmo conteúdo dar o mesmo hash. */
export function hashDoConteudo(conteudo: unknown): string {
  const estavel = JSON.stringify(conteudo, Object.keys(conteudo as object).sort());
  return `sha256:${createHash("sha256").update(estavel).digest("hex")}`;
}

const TEMPO_LIMITE_MS = 10_000;

export async function consultaCnpj(entrada: string): Promise<ResultadoColeta> {
  // 1. Rejeitar antes de gastar rede. CNPJ inválido não vira consulta nem
  //    evidência — nem mesmo evidência de que a fonte disse "não existe".
  const cnpj = digitosDoCnpj(entrada);
  if (!cnpj) return { ok: false, motivo: "CNPJ inválido — não foi consultado." };

  const candidatos = provedoresUtilizaveis(cnpj);
  if (candidatos.length === 0) {
    return { ok: false, motivo: "Nenhum provedor com destino permitido configurado." };
  }

  const recusas: string[] = [];
  for (const { provedor, url } of candidatos) {
    // 2. A trava de destino roda de novo aqui, imediatamente antes do fetch.
    //    Conferir na montagem e não na chamada deixaria uma janela entre as
    //    duas — e é na chamada que o risco existe.
    const veredito = destinoPermitido(url);
    if (!veredito.ok) {
      recusas.push(`${provedor.nome}: ${veredito.motivo}`);
      continue;
    }

    try {
      const r = await fetch(veredito.url, {
        // ⚠️ Sem seguir redirecionamento: o destino foi conferido, mas um
        // redirecionamento levaria a requisição para um host que a trava nunca
        // examinou. É o jeito mais comum de furar lista de permitidos.
        redirect: "error",
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
        headers: { accept: "application/json" },
      });

      if (!r.ok) {
        recusas.push(`${provedor.nome}: HTTP ${r.status}`);
        continue;
      }
      const conteudo = (await r.json()) as unknown;
      if (recusas.length > 0) {
        // Falha de provedor não pode virar sucesso mudo: ela vai para o log
        // mesmo quando outro respondeu.
        logError(
          "sources.cnpj.provedor_pulado",
          new Error(`respondeu ${provedor.nome} depois de: ${recusas.join(" | ")}`),
        );
      }
      return {
        ok: true,
        coleta: {
          cnpj,
          provedor,
          url,
          conteudo,
          hash: hashDoConteudo(conteudo),
          recusasAnteriores: [...recusas],
        },
      };
    } catch (err) {
      logError("sources.cnpj.consulta", err);
      recusas.push(`${provedor.nome}: ${err instanceof Error ? err.message : "falha"}`);
    }
  }

  // ⚠️ O motivo carrega o que CADA provedor respondeu, não uma frase genérica.
  // Mensagem que serve para qualquer causa custa rodadas de investigação — foi
  // o que manteve uma campanha parada dois dias no projeto anterior.
  return { ok: false, motivo: `Nenhum provedor respondeu. ${recusas.join(" | ")}` };
}
