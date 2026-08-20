/**
 * A trava de destino — pendência 21.
 *
 * `sources.endpoint` é texto livre, cadastrado por gente, e consumido por uma
 * rotina que faz requisição **a partir do servidor**. Servidor alcança o que o
 * navegador nunca alcançaria: rede interna, metadados de nuvem, banco de dados.
 *
 * ⚠️ A lista é de **destinos permitidos**, não de proibidos. Lista de proibidos
 * é uma corrida que se perde: sempre falta uma forma de escrever o mesmo
 * endereço. Permitir explicitamente é a única que fecha.
 */
import { describe, expect, it } from "vitest";
import { destinoPermitido, HOSTS_PERMITIDOS } from "@/lib/sources/destino-permitido";

describe("destinoPermitido", () => {
  it("aceita os provedores gratuitos cadastrados", () => {
    expect(destinoPermitido("https://brasilapi.com.br/api/cnpj/v1/33000167000101").ok).toBe(true);
    expect(destinoPermitido("https://minhareceita.org/33000167000101").ok).toBe(true);
  });

  it("recusa host que não está na lista, mesmo sendo https", () => {
    const r = destinoPermitido("https://api-qualquer.com/cnpj/1");
    expect(r.ok).toBe(false);
    // O motivo precisa nomear a causa: erro genérico custa rodadas de
    // investigação a quem for ler o log depois.
    if (!r.ok) expect(r.motivo).toContain("não está na lista");
  });

  it("recusa http sem TLS — evidência não viaja em claro", () => {
    expect(destinoPermitido("http://brasilapi.com.br/api/cnpj/v1/1").ok).toBe(false);
  });

  /**
   * ⚠️ Os casos abaixo são o motivo de a trava existir. Todos apontam para
   * dentro da própria infraestrutura, e todos já foram usados em ataques reais.
   */
  it("recusa localhost e endereço de retorno", () => {
    for (const u of [
      "https://localhost/x",
      "https://127.0.0.1/x",
      "https://[::1]/x",
      "https://0.0.0.0/x",
    ]) {
      expect(destinoPermitido(u).ok, `${u} deveria ser recusado`).toBe(false);
    }
  });

  it("recusa rede privada", () => {
    for (const u of ["https://10.0.0.5/x", "https://192.168.1.1/x", "https://172.16.0.1/x"]) {
      expect(destinoPermitido(u).ok, `${u} deveria ser recusado`).toBe(false);
    }
  });

  /**
   * ⚠️ O endereço de metadados da nuvem é o alvo clássico: quem consegue fazer
   * o servidor buscá-lo leva credencial da infraestrutura inteira.
   */
  it("recusa o endereço de metadados de nuvem", () => {
    expect(destinoPermitido("https://169.254.169.254/latest/meta-data/").ok).toBe(false);
  });

  /**
   * ⚠️ O truque do `@`: o navegador e muitos validadores ingênuos leem
   * "brasilapi.com.br" como host, quando o host de verdade é o que vem DEPOIS
   * do arroba. É assim que uma lista de permitidos mal feita é enganada.
   */
  it("recusa o truque do arroba, onde o host real vem depois", () => {
    const r = destinoPermitido("https://brasilapi.com.br@169.254.169.254/x");
    expect(r.ok).toBe(false);
  });

  it("recusa subdomínio parecido — sufixo não é igualdade", () => {
    expect(destinoPermitido("https://brasilapi.com.br.evil.test/x").ok).toBe(false);
    expect(destinoPermitido("https://naobrasilapi.com.br/x").ok).toBe(false);
  });

  it("recusa porta fora do padrão", () => {
    expect(destinoPermitido("https://brasilapi.com.br:8080/x").ok).toBe(false);
  });

  it("recusa entrada que nem é URL", () => {
    expect(destinoPermitido("nao é url").ok).toBe(false);
    expect(destinoPermitido("").ok).toBe(false);
  });

  it("a lista de permitidos não está vazia — trava vazia libera tudo", () => {
    expect(HOSTS_PERMITIDOS.length).toBeGreaterThan(0);
  });
});
