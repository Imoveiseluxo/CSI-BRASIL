/**
 * Leitura do e-mail que chega por webhook — agnóstica de serviço.
 *
 * ⚠️ Cada serviço de entrada nomeia os campos do seu jeito: uns mandam `from`,
 * outros `sender`, outros `FromFull.Email`. Aceitar as formas comuns é o que
 * permite trocar de serviço sem reescrever o conector — e foi por isso que a
 * escolha do serviço ficou aberta na pendência 25 sem travar o código.
 *
 * ⚠️ E vale a lição que o outro projeto deu hoje: **formato de e-mail muda sem
 * aviso.** Por isso o corpo cru vira evidência ANTES de qualquer interpretação;
 * o que esta função extrai é só o que serve para indexar e achar depois.
 */
import { describe, expect, it } from "vitest";
import { leEmailRecebido } from "@/lib/sources/email-entrada";

describe("leEmailRecebido", () => {
  it("lê o formato mais comum", () => {
    const e = leEmailRecebido({
      from: "alguem@exemplo.com",
      subject: "Aviso de licitação",
      text: "Corpo da mensagem",
      messageId: "<abc@exemplo.com>",
    });
    expect(e.remetente).toBe("alguem@exemplo.com");
    expect(e.assunto).toBe("Aviso de licitação");
    expect(e.corpo).toBe("Corpo da mensagem");
    expect(e.identificador).toBe("<abc@exemplo.com>");
  });

  it("aceita os nomes alternativos que outros serviços usam", () => {
    const e = leEmailRecebido({
      sender: "outro@exemplo.com",
      Subject: "Outro assunto",
      TextBody: "Outro corpo",
      "message-id": "<xyz@exemplo.com>",
    });
    expect(e.remetente).toBe("outro@exemplo.com");
    expect(e.assunto).toBe("Outro assunto");
    expect(e.corpo).toBe("Outro corpo");
    expect(e.identificador).toBe("<xyz@exemplo.com>");
  });

  it("usa o corpo em HTML quando não há texto puro", () => {
    const e = leEmailRecebido({ from: "a@b.c", html: "<p>Só HTML</p>" });
    expect(e.corpo).toContain("Só HTML");
  });

  /**
   * ⚠️ Sem remetente não dá para dizer de onde veio — e evidência sem origem
   * não é evidência. Recusar é mais honesto que gravar "desconhecido".
   */
  it("recusa e-mail sem remetente", () => {
    expect(() => leEmailRecebido({ subject: "sem quem" })).toThrow();
  });

  it("recusa payload que não é objeto", () => {
    expect(() => leEmailRecebido(null as unknown as Record<string, unknown>)).toThrow();
  });

  it("campo ausente vira null, nunca string vazia", () => {
    const e = leEmailRecebido({ from: "a@b.c" });
    expect(e.assunto).toBeNull();
    expect(e.corpo).toBeNull();
    expect(e.identificador).toBeNull();
  });

  /**
   * ⚠️ O identificador é o que permite reconhecer o MESMO e-mail chegando duas
   * vezes — reenvio do serviço, encaminhamento duplicado. Sem ele, a mesma
   * mensagem viraria duas evidências e contaria duas vezes em qualquer medição.
   */
  it("preserva o identificador da mensagem, que serve para não contar duas vezes", () => {
    const e = leEmailRecebido({ from: "a@b.c", messageId: "<unico@exemplo.com>" });
    expect(e.identificador).toBe("<unico@exemplo.com>");
  });
});
