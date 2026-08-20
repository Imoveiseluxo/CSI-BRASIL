/**
 * Leitura do e-mail que chega por webhook — **agnóstica de serviço**.
 *
 * Decisão do dono (19/08/2026): o e-mail é encaminhado para um endereço nosso e
 * um serviço entrega o conteúdo numa rota nossa. **Nenhuma senha de caixa é
 * guardada** — é a razão inteira da escolha.
 *
 * ⚠️ Cada serviço nomeia os campos do seu jeito. Aceitar as formas comuns é o
 * que permite escolher o serviço depois sem reescrever nada.
 *
 * ⚠️ **Esta função não decide nada sobre o conteúdo.** O corpo cru vira
 * evidência com hash **antes** de qualquer interpretação. O que se extrai aqui
 * serve só para achar depois — e formato de e-mail muda sem aviso, como o outro
 * projeto do dono mostrou hoje.
 */

export type EmailRecebido = {
  remetente: string;
  assunto: string | null;
  corpo: string | null;
  /** Serve para reconhecer o MESMO e-mail chegando duas vezes. */
  identificador: string | null;
};

function primeiroTexto(bruto: Record<string, unknown>, chaves: string[]): string | null {
  for (const chave of chaves) {
    const v = bruto[chave];
    if (v === null || v === undefined) continue;
    // Alguns serviços mandam objeto: { Email: "x@y.z", Name: "..." }
    if (typeof v === "object") {
      const email = (v as Record<string, unknown>).Email ?? (v as Record<string, unknown>).email;
      if (typeof email === "string" && email.trim()) return email.trim();
      continue;
    }
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

/** Tira as marcações do HTML para o texto ficar pesquisável. */
function textoDoHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function leEmailRecebido(bruto: Record<string, unknown>): EmailRecebido {
  if (!bruto || typeof bruto !== "object") {
    throw new Error("Conteúdo recebido não é um objeto.");
  }

  const remetente = primeiroTexto(bruto, ["from", "sender", "From", "Sender", "FromFull"]);
  if (!remetente) {
    // ⚠️ Recusar, e não gravar "desconhecido": evidência sem origem não é
    // evidência, e um valor de enfeite esconderia o problema para sempre.
    throw new Error("E-mail sem remetente — não dá para registrar a origem.");
  }

  const assunto = primeiroTexto(bruto, ["subject", "Subject"]);
  const texto = primeiroTexto(bruto, ["text", "TextBody", "plain", "body"]);
  const html = primeiroTexto(bruto, ["html", "HtmlBody"]);
  const corpo = texto ?? (html ? textoDoHtml(html) : null);
  const identificador = primeiroTexto(bruto, [
    "messageId",
    "message-id",
    "MessageID",
    "Message-Id",
  ]);

  return { remetente, assunto, corpo, identificador };
}
