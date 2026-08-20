import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/types/supabase";

/**
 * Busca textual sobre o que já foi coletado, ordenada por relevância.
 *
 * ⚠️ **Roda com o cliente do usuário**, e a função no banco é `security
 * invoker` — então a RLS decide o que ele pode achar. Busca com poderes
 * elevados acharia dado de qualquer organização, e busca é justamente onde um
 * vazamento passa despercebido: o resultado parece legítimo.
 */

export type Achado = {
  tipo: "empresa" | "evidencia";
  id: string;
  titulo: string;
  detalhe: string;
  /** Trecho com o termo marcado. `null` em evidência, de propósito. */
  trecho: string | null;
  fonte: string | null;
  coletadoEm: string | null;
  confianca: number | null;
  relevancia: number;
};

/**
 * Tira o acento do termo digitado.
 *
 * ⚠️ **O índice do banco guarda o texto sem acento** (migration 0009), então o
 * termo tem que chegar igual. Tirar de um lado só deixaria a busca meio
 * consertada — que é pior que não consertada: funcionaria para quem digita sem
 * acento e falharia para quem digita certo.
 *
 * ⚠️ Isto veio de medição, não de suposição: `to_tsvector('portuguese','SÃO
 * PAULO')` **não** casa com `websearch_to_tsquery('portuguese','sao paulo')`.
 *
 * Continua aqui, e não só no banco, porque a função `buscar` também aplica
 * `sem_acento` — as duas pontas precisam concordar, e ter as duas explícitas é
 * o que impede uma ser mudada sem a outra.
 */
export function semAcento(t: string): string {
  return t.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Um pedaço do trecho: `marcado` quando casou com o termo buscado. */
export type Pedaco = { texto: string; marcado: boolean };

// Os marcadores que o `ts_headline` da migration 0010 usa (StartSel/StopSel).
//
// ⚠️ Montados por código de caractere, e **não** escritos crus no arquivo: são
// caracteres de controle, invisíveis. Byte invisível em código-fonte some sem
// ninguém ver — num diff, numa cópia, num editor que "limpa" o arquivo — e a
// falha apareceria só como destaque que parou de funcionar.
const MARCA_ABRE = String.fromCharCode(2);
const MARCA_FECHA = String.fromCharCode(3);

/**
 * Quebra o trecho vindo do banco nos pedaços que casaram e nos que não casaram.
 *
 * ⚠️ **Existe para NÃO usar `dangerouslySetInnerHTML`.** O jeito comum de
 * destacar é pedir `<b>` ao `ts_headline` e injetar como HTML — mas esse texto
 * é derivado de dado de fonte externa, e injetar HTML de fora é XSS. Aqui o
 * texto continua texto, e o React escapa cada pedaço.
 *
 * ⚠️ Marcador de abertura sem o fechamento (trecho cortado no limite de
 * palavras) não pode fazer o resto sumir: o que sobra vai como pedaço marcado,
 * nunca descartado. Perder texto em silêncio é pior que destacar demais.
 */
export function pedacosDoTrecho(trecho: string | null): Pedaco[] {
  if (!trecho) return [];
  const saida: Pedaco[] = [];
  const blocos = trecho.split(MARCA_ABRE);
  for (const [i, bloco] of blocos.entries()) {
    const corte = bloco.indexOf(MARCA_FECHA);
    if (corte === -1) {
      // Sem fechamento: ou é o texto antes da primeira marca (i === 0), ou é
      // uma marca que o corte de palavras truncou. Nos dois casos vai inteiro.
      if (bloco) saida.push({ texto: bloco, marcado: i > 0 });
      continue;
    }
    const dentro = bloco.slice(0, corte);
    const depois = bloco.slice(corte + 1);
    if (dentro) saida.push({ texto: dentro, marcado: true });
    if (depois) saida.push({ texto: depois, marcado: false });
  }
  return saida;
}

/* ------------------------------------------------------------------ filtros */

/** Os períodos oferecidos na tela. `tudo` é o padrão e não filtra nada. */
export const PERIODOS = {
  tudo: "Qualquer data",
  "7": "Últimos 7 dias",
  "30": "Últimos 30 dias",
  "90": "Últimos 90 dias",
} as const;

export type Periodo = keyof typeof PERIODOS;

/**
 * Valida os filtros que chegam pela URL.
 *
 * ⚠️ **Isto é input externo.** Vem da barra de endereço, onde qualquer um
 * escreve o que quiser. Um `fonte` que não seja um UUID faria o Postgres
 * devolver erro de sintaxe em vez de resultado, e a tela quebraria com uma
 * mensagem técnica na cara do usuário.
 *
 * ⚠️ **Valor inválido vira "sem filtro", nunca "filtro impossível".** Filtrar
 * por lixo devolveria zero resultados — indistinguível de "não existe nada", e
 * a busca passaria a mentir por omissão. Sem filtro, a pessoa ao menos vê o que
 * existe.
 */
export const filtrosSchema = z.object({
  periodo: z.enum(["tudo", "7", "30", "90"]).catch("tudo"),
  fonte: z.uuid().optional().catch(undefined),
});

export type Filtros = z.infer<typeof filtrosSchema>;

/**
 * Converte o período escolhido na data-corte que vai para o banco.
 *
 * Recebe `agora` de fora de propósito: função que lê o relógio sozinha não dá
 * para testar sem esperar o tempo passar.
 */
export function desdeDoPeriodo(periodo: Periodo, agora: Date): string | null {
  if (periodo === "tudo") return null;
  const dias = Number(periodo);
  return new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();
}

type LinhaBruta = {
  tipo: string;
  id: string;
  titulo: string | null;
  detalhe: string | null;
  trecho: string | null;
  fonte: string | null;
  coletado_em: string | null;
  confianca: number | string | null;
  relevancia: number | null;
};

export async function busca(
  supabase: SupabaseClient<Database>,
  orgId: string,
  termo: string,
  filtros: Filtros = { periodo: "tudo", fonte: undefined },
  agora: Date = new Date(),
): Promise<Achado[]> {
  const limpo = termo.trim();
  if (!limpo) return [];

  // A ordenação por relevância, o trecho destacado e os filtros vêm do banco,
  // onde o índice está — filtrar aqui exigiria trazer tudo antes de descartar.
  const { data, error } = await supabase.rpc("buscar", {
    p_org: orgId,
    p_termo: semAcento(limpo),
    // ⚠️ `undefined` e não `null`: omitido, o PostgREST deixa o banco usar o
    // padrão da função (`null` = não filtra). Mandar `null` explícito funciona
    // igual, mas os tipos gerados declaram o parâmetro como opcional.
    p_desde: desdeDoPeriodo(filtros.periodo, agora) ?? undefined,
    p_fonte: filtros.fonte ?? undefined,
  });
  if (error) throw error;

  return ((data ?? []) as unknown as LinhaBruta[]).map((l) => ({
    tipo: l.tipo === "evidencia" ? "evidencia" : "empresa",
    id: l.id,
    titulo: l.titulo ?? "(sem título)",
    detalhe: l.detalhe ?? "",
    trecho: l.trecho,
    fonte: l.fonte,
    coletadoEm: l.coletado_em,
    // ⚠️ `null` continua `null`: confiança não informada não vira zero.
    confianca: l.confianca === null ? null : Number(l.confianca),
    relevancia: Number(l.relevancia ?? 0),
  }));
}
