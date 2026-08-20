import { createHash } from "node:crypto";
import { logError } from "@/lib/logger";
import { hashDoConteudo } from "@/lib/sources/cnpj";
import { leEmailRecebido } from "@/lib/sources/email-entrada";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/supabase";

/**
 * Entrada de e-mail por webhook.
 *
 * **Decisão do dono (19/08/2026):** o e-mail é encaminhado para um endereço
 * nosso e um serviço entrega o conteúdo aqui. **Nenhuma senha de caixa de
 * e-mail é guardada por nós** — é a razão inteira da escolha.
 *
 * ⚠️ **Quem chama isto não está autenticado como pessoa.** Quem prova quem é
 * é o **token da fonte**, e é ele que diz de qual organização o conteúdo é.
 * Guardamos só o hash do token: quem ganhar leitura do banco não sai usando as
 * entradas de terceiros.
 *
 * ⚠️ **A rota grava o corpo CRU como evidência e não interpreta nada além do
 * mínimo para achar depois.** Formato de e-mail muda sem aviso — no outro
 * projeto do dono, a especificação de um deles teve que ser lida de uma captura
 * de tela. Guardar primeiro, interpretar depois, é o que permite reprocessar
 * quando o formato mudar sem ter perdido nada.
 */
export const runtime = "nodejs";

function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request): Promise<Response> {
  const cabecalho = req.headers.get("authorization") ?? "";
  const token = cabecalho.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    return Response.json({ erro: "Token de entrada ausente." }, { status: 401 });
  }

  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    return Response.json({ erro: "Corpo precisa ser JSON válido." }, { status: 400 });
  }

  // ⚠️ Cliente de serviço, e não o do usuário: quem chama é um sistema, não uma
  // pessoa logada — não há sessão para a RLS avaliar. A separação por
  // organização é feita AQUI, pelo token, e por isso a consulta abaixo é a
  // única coisa entre um tenant e outro.
  const supabase = createServiceClient();
  const { data: fonte, error } = await supabase
    .from("sources")
    .select("id, organization_id, is_active")
    .eq("webhook_token_hash", hashDoToken(token))
    .maybeSingle();

  if (error) {
    logError("entrada.email.busca_fonte", error);
    return Response.json({ erro: "Falha ao identificar a fonte." }, { status: 500 });
  }
  // ⚠️ Mesma resposta para token inexistente e token de fonte desligada: dizer
  // "essa fonte existe mas está inativa" confirmaria a existência do token para
  // quem estivesse tentando adivinhar.
  if (!fonte || !fonte.is_active) {
    return Response.json({ erro: "Token de entrada inválido." }, { status: 401 });
  }

  let email: ReturnType<typeof leEmailRecebido>;
  try {
    email = leEmailRecebido(bruto as Record<string, unknown>);
  } catch (err) {
    // ⚠️ 400, não 500: o conteúdo é que está errado, não nós. E o motivo vai
    // por extenso — mensagem genérica aqui custaria rodadas de investigação
    // quando o serviço de entrada mudar de formato.
    return Response.json(
      { erro: err instanceof Error ? err.message : "Conteúdo inválido." },
      { status: 400 },
    );
  }

  const { data: gravada, error: erroGravar } = await supabase
    .from("evidence")
    .insert({
      organization_id: fonte.organization_id,
      source_id: fonte.id,
      // O corpo CRU, como chegou. Nada de campo derivado aqui.
      // O corpo veio de fora e é JSON válido (já foi parseado): a conversão
      // aqui é para o tipo do banco, não para silenciar verificação.
      content: bruto as Json,
      content_hash: hashDoConteudo(bruto),
      // Serve para reconhecer o mesmo e-mail chegando duas vezes.
      request_key: email.identificador ?? email.remetente,
      collected_by_kind: "rotina",
    })
    .select("id")
    .single();

  if (erroGravar || !gravada) {
    logError("entrada.email.gravar_evidencia", erroGravar);
    return Response.json({ erro: "Falha ao registrar a evidência." }, { status: 500 });
  }

  return Response.json(
    { ok: true, evidencia: gravada.id, remetente: email.remetente, assunto: email.assunto },
    { status: 201 },
  );
}
