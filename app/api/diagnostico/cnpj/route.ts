import { consultaCnpj } from "@/lib/sources/cnpj";
import { normalizaEmpresa } from "@/lib/sources/cnpj-normaliza";

/**
 * Rota de DIAGNÓSTICO do conector de CNPJ.
 *
 * POR QUE EXISTE: a máquina de desenvolvimento não tem saída de rede para os
 * provedores — uma tentativa ficou pendurada dez minutos. Sem isto, a única
 * afirmação possível seria *"o conector está testado na lógica"*, que não é o
 * mesmo que *"a consulta real funciona"*. Esta rota permite medir do lugar onde
 * o código realmente roda.
 *
 * ⚠️ **Protegida por segredo, e não por obscuridade.** Rota que dispara
 * requisição externa sem autenticação é abuso esperando acontecer: qualquer um
 * a usaria para consultar em nosso nome, gastar nossa cota e sujar nossa
 * reputação junto ao provedor.
 *
 * ⚠️ **Ela NÃO grava nada.** Não cria evidência nem empresa — é medição, não
 * ingestão. Diagnóstico que escreve no banco vira dado de teste em produção.
 */
export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const segredo = process.env.DIAGNOSTICO_SECRET;
  if (!segredo) {
    // Sem segredo configurado a rota fica FECHADA, não aberta. Falhar fechado é
    // a única opção defensável: configuração ausente não pode virar porta.
    return Response.json({ erro: "Diagnóstico não configurado." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const cnpj = new URL(req.url).searchParams.get("cnpj");
  if (!cnpj) {
    return Response.json({ erro: "Informe ?cnpj=" }, { status: 400 });
  }

  const comecou = Date.now();
  const r = await consultaCnpj(cnpj);
  const levou = Date.now() - comecou;

  if (!r.ok) {
    return Response.json({ ok: false, motivo: r.motivo, levou_ms: levou }, { status: 502 });
  }

  // A normalização roda aqui de propósito: é o pedaço que quebra quando a fonte
  // muda de formato, e é justamente isso que este diagnóstico precisa revelar.
  let normalizada: unknown = null;
  let erroNormalizacao: string | null = null;
  try {
    normalizada = normalizaEmpresa(r.coleta.conteudo as Record<string, unknown>);
  } catch (err) {
    erroNormalizacao = err instanceof Error ? err.message : "falha ao normalizar";
  }

  return Response.json({
    ok: true,
    levou_ms: levou,
    provedor: r.coleta.provedor.nome,
    custo: r.coleta.provedor.custo,
    url: r.coleta.url,
    hash: r.coleta.hash,
    // Quem falhou antes de este responder. Vazio = o primeiro da lista atendeu.
    recusas_anteriores: r.coleta.recusasAnteriores,
    normalizada,
    erro_normalizacao: erroNormalizacao,
    // Amostra do artefato cru, para conferir se o formato é o que a
    // normalização espera. Truncada: o diagnóstico não é para despejar tudo.
    campos_recebidos: Object.keys((r.coleta.conteudo as object) ?? {}).slice(0, 40),
  });
}
