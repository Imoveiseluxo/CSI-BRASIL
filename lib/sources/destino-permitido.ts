/**
 * Trava de destino para qualquer requisição que a rotina de coleta faça.
 *
 * POR QUE EXISTE: `sources.endpoint` é texto livre, cadastrado por gente, e
 * consumido por uma rotina que faz requisição **a partir do servidor**. O
 * servidor alcança o que o navegador nunca alcançaria — rede interna, banco de
 * dados, e o endereço de metadados da nuvem, que entrega credencial da
 * infraestrutura inteira a quem conseguir fazer o servidor buscá-lo.
 *
 * ⚠️ **Lista de PERMITIDOS, não de proibidos.** Lista de proibidos é corrida
 * que se perde: sempre falta uma forma de escrever o mesmo endereço (decimal,
 * octal, IPv6 mapeado, redirecionamento). Permitir explicitamente é a única
 * abordagem que fecha.
 */

/**
 * Provedores gratuitos, decisão do dono em 19/08/2026: *"todas gratuitas,
 * implantar no futuro CDL e outras pagas — deixar preparado"*.
 *
 * **Acrescentar provedor pago é acrescentar uma linha aqui** — não é reescrever
 * o conector. Foi para isso que a lista existe separada.
 */
export const HOSTS_PERMITIDOS: readonly string[] = ["brasilapi.com.br", "minhareceita.org"];

export type Veredito = { ok: true; url: URL } | { ok: false; motivo: string };

/** Faixas que apontam para dentro da própria infraestrutura. */
function ehEnderecoInterno(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");

  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "::1" || h === "0.0.0.0") return true;

  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 0 || a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 169.254.0.0/16 — link-local, onde mora o endereço de metadados de nuvem.
    if (a === 169 && b === 254) return true;
    return true; // ⚠️ IP literal nunca é destino legítimo aqui: só nome na lista.
  }
  return false;
}

export function destinoPermitido(entrada: string | null | undefined): Veredito {
  const bruto = String(entrada ?? "").trim();
  if (!bruto) return { ok: false, motivo: "endereço vazio" };

  let url: URL;
  try {
    url = new URL(bruto);
  } catch {
    return { ok: false, motivo: "não é um endereço válido" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, motivo: "só https — evidência não viaja em claro" };
  }

  // ⚠️ O truque do arroba: em `https://permitido.com@evil.test/x`, o host de
  // verdade é `evil.test`. `URL` resolve isso certo, mas quem compara a string
  // crua é enganado. Recusamos qualquer credencial embutida para não depender
  // dessa sutileza.
  if (url.username || url.password) {
    return { ok: false, motivo: "endereço com credencial embutida" };
  }

  if (url.port && url.port !== "443") {
    return { ok: false, motivo: `porta fora do padrão: ${url.port}` };
  }

  const host = url.hostname.toLowerCase();
  if (ehEnderecoInterno(host)) {
    return { ok: false, motivo: "aponta para dentro da própria infraestrutura" };
  }

  // ⚠️ Igualdade exata, não sufixo. `brasilapi.com.br.evil.test` termina com o
  // host permitido e não é ele.
  if (!HOSTS_PERMITIDOS.includes(host)) {
    return { ok: false, motivo: `host não está na lista de permitidos: ${host}` };
  }

  return { ok: true, url };
}
