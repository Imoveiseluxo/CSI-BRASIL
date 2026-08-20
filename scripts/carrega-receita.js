/**
 * Carrega um arquivo da base pública de CNPJ da Receita Federal.
 *
 * Uso:
 *   PGPASS=... node scripts/carrega-receita.js Socios9.zip rf_socios [--mes 2026-07-12]
 *
 * O que ele faz, nesta ordem:
 *   1. baixa o arquivo (ou reaproveita o que já está em disco),
 *   2. calcula o sha256 do que baixou,
 *   3. abre uma linha em `rf_carga` — a procedência da carga,
 *   4. descompacta e manda o CSV para o Postgres com COPY,
 *   5. fecha a linha de `rf_carga` com a contagem real de linhas.
 *
 * ⚠️ **Se qualquer passo falhar, `rf_carga` fica com `concluida_em` nulo e o
 * erro escrito.** Carga pela metade que se parece com carga completa é o pior
 * resultado possível: a rede fica com buraco e ninguém vê.
 *
 * ⚠️ **A origem é registrada como `espelho`**, e isso é deliberado. Medido em
 * 20/08/2026: `dadosabertos.rfb.gov.br` (200.152.38.155:443) não aceita conexão
 * do nosso ambiente — tempo esgotado em 21s — enquanto `gov.br` responde em 1s.
 * Dizer "veio da Receita" quando veio de terceiro seria afirmação sem lastro,
 * dentro de um produto cuja premissa inteira é procedência.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { pipeline } = require("node:stream/promises");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");
const { from: copyFrom } = require("pg-copy-streams");

const REF = "mmgucspxrfxdcztkrklb";
const MES_PADRAO = "2026-07-12";
const ESPELHO = "https://dados-abertos-rf-cnpj.casadosdados.com.br/arquivos";

/** As colunas de cada destino, na ORDEM EXATA do arquivo da Receita. */
const LAYOUT = {
  // Conferido no arquivo real K3241.K03200Y9.D60711.SOCIOCSV em 20/08/2026:
  // 11 colunas, separador ';', tudo entre aspas, LATIN-1, sem cabeçalho.
  rf_socios: [
    "cnpj_basico",
    "identificador_socio",
    "nome_socio",
    "documento_socio",
    "qualificacao_socio",
    "data_entrada",
    "pais",
    "representante_documento",
    "nome_representante",
    "qualificacao_representante",
    "faixa_etaria",
  ],
  rf_empresas: [
    "cnpj_basico",
    "razao_social",
    "natureza_juridica",
    "qualificacao_responsavel",
    "capital_social",
    "porte",
    "ente_federativo",
  ],
  rf_qualificacoes: ["codigo", "descricao"],
  rf_naturezas: ["codigo", "descricao"],
  rf_paises: ["codigo", "descricao"],
  rf_municipios: ["codigo", "descricao"],
  rf_cnaes: ["codigo", "descricao"],
  rf_motivos: ["codigo", "descricao"],
};

/**
 * Colunas que NÃO são texto e por isso precisam virar nulo quando vêm vazias.
 *
 * ⚠️ Sem isto o COPY morre na primeira linha com campo vazio, porque `""` não é
 * uma data válida. `force_null` só existe para o formato csv, e é o motivo de
 * não usarmos `format text`.
 */
const NULOS = {
  rf_socios: ["data_entrada"],
  rf_empresas: ["capital_social"],
};

function argumento(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  return i > -1 ? process.argv[i + 1] : padrao;
}

function conecta() {
  const senha = process.env.PGPASS;
  if (!senha) {
    // ⚠️ Erro tem de dizer ONDE parou. "falhou" serve para dez causas.
    throw new Error(
      "Falta a variável PGPASS com a senha do banco. Ela está em senha-banco-csi-brasil.txt.",
    );
  }
  // ⚠️ **Verificação de certificado LIGADA, com a CA do Supabase fixada.**
  // O servidor de banco do Supabase usa CA própria, então o Node recusa por
  // padrão ("self-signed certificate in certificate chain"). O caminho fácil
  // seria `rejectUnauthorized: false` — e isso desliga a proteção contra alguém
  // no meio do caminho, justamente numa conexão que carrega a senha do banco.
  // Fixar a CA resolve sem abrir mão de nada. Medido em 20/08/2026: com a CA
  // fixada e a verificação ligada, conecta.
  const ca = fs.readFileSync(path.join(process.cwd(), "supabase/prod-ca-2021.crt"), "utf8");
  return new Client({
    host: `db.${REF}.supabase.co`,
    port: 5432,
    user: "postgres",
    password: senha,
    database: "postgres",
    ssl: { ca, rejectUnauthorized: true },
    // Carga de milhões de linhas não pode morrer por impaciência do cliente.
    statement_timeout: 0,
    query_timeout: 0,
  });
}

async function baixa(url, destino) {
  if (fs.existsSync(destino) && fs.statSync(destino).size > 0) {
    console.log(`  já em disco: ${path.basename(destino)}`);
    return;
  }
  console.log(`  baixando ${url}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download falhou: HTTP ${r.status} em ${url}`);
  await pipeline(r.body, fs.createWriteStream(destino));
}

function sha256(arquivo) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(arquivo));
  return `sha256:${h.digest("hex")}`;
}

/**
 * Descompacta e devolve o caminho do CSV.
 *
 * ⚠️ **Pergunta ao zip qual é o nome do arquivo**, em vez de comparar o que
 * apareceu de novo na pasta. A primeira versão fazia a comparação e falhou na
 * segunda execução — o CSV já estava lá da tentativa anterior, nada "novo"
 * apareceu, e o script disse que não achou. Detecção que depende do que já
 * existia em disco quebra exatamente quando se tenta de novo, que é justo
 * quando ela precisa funcionar.
 */
function descompacta(zip, pasta) {
  const lista = spawnSync("unzip", ["-Z1", zip], { encoding: "utf8" });
  if (lista.error || lista.status !== 0) {
    throw new Error(
      `não consegui ler o conteúdo de ${path.basename(zip)}: ${lista.error?.message ?? lista.stderr ?? `saída ${lista.status}`}. ` +
        "Este script depende do comando `unzip` no PATH.",
    );
  }
  const dentro = lista.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (dentro.length !== 1) {
    throw new Error(
      `esperava exatamente 1 arquivo dentro de ${path.basename(zip)}, achei ${dentro.length}: ${dentro.join(", ")}`,
    );
  }

  const r = spawnSync("unzip", ["-o", "-q", zip, "-d", pasta], { encoding: "utf8" });
  if (r.error || r.status !== 0) {
    throw new Error(
      `não consegui descompactar ${path.basename(zip)}: ${r.error?.message ?? r.stderr ?? `saída ${r.status}`}`,
    );
  }
  const csv = path.join(pasta, dentro[0]);
  if (!fs.existsSync(csv)) {
    throw new Error(
      `descompactei ${path.basename(zip)}, mas ${dentro[0]} não apareceu em ${pasta}`,
    );
  }
  return csv;
}

/**
 * Conta as linhas de um arquivo, **em fluxo**.
 *
 * ⚠️ Ler o arquivo inteiro na memória para contar quebraria com o `Socios0`,
 * que tem 960 MB — em JavaScript isso vira quase 2 GB de texto. Contar byte a
 * byte usa memória constante, qualquer que seja o tamanho.
 *
 * ⚠️ **Só é comparável com o que o COPY inseriu porque foi medido que nenhum
 * registro atravessa mais de uma linha**: em 20/08/2026, todas as 9.820.028
 * linhas do `Socios0` tinham exatamente 11 campos. Se um dia um arquivo tiver
 * quebra de linha dentro de aspas, esta contagem passa a ser maior que o número
 * de registros e o carregador vai acusar divergência — o que é o comportamento
 * certo: melhor parar e alguém olhar do que carregar torto.
 */
function contaLinhas(caminho) {
  return new Promise((resolve, reject) => {
    let n = 0;
    let ultimoByte = 10;
    fs.createReadStream(caminho)
      .on("data", (bloco) => {
        for (let i = 0; i < bloco.length; i++) {
          if (bloco[i] === 10) n++;
        }
        ultimoByte = bloco[bloco.length - 1];
      })
      // Arquivo que não termina em quebra de linha tem uma linha a mais.
      .on("end", () => resolve(ultimoByte === 10 ? n : n + 1))
      .on("error", reject);
  });
}

async function principal() {
  const arquivo = process.argv[2];
  const tabela = process.argv[3];
  const mes = argumento("mes", MES_PADRAO);
  const pasta = argumento("pasta", path.join(process.cwd(), ".receita"));

  if (!arquivo || !tabela) {
    console.log(
      "uso: node scripts/carrega-receita.js <Arquivo.zip> <rf_tabela> [--mes AAAA-MM-DD]",
    );
    process.exit(1);
  }
  const colunas = LAYOUT[tabela];
  if (!colunas) {
    throw new Error(
      `não conheço o layout da tabela ${tabela}. Conhecidos: ${Object.keys(LAYOUT).join(", ")}`,
    );
  }

  fs.mkdirSync(pasta, { recursive: true });
  const url = `${ESPELHO}/${mes}/${arquivo}`;
  const zip = path.join(pasta, arquivo);

  // ⚠️ **Carga em pedaços**, para arquivos grandes demais para uma execução só.
  //
  // O `Socios0` tem 960 MB de CSV e leva mais de uma hora subindo — e uma
  // execução longa demais foi interrompida no meio em 20/08/2026. Partir o CSV
  // e carregar pedaço a pedaço troca "uma hora que pode morrer inteira" por
  // "vários minutos que, se morrerem, custam só um pedaço".
  //
  // ⚠️ **Cada pedaço é uma carga própria em `rf_carga`**, com o rótulo dizendo
  // qual pedaço é — mas guardando a MESMA `origem_url` e o MESMO hash do
  // arquivo original. A procedência continua apontando para o arquivo de
  // verdade que a Receita publicou, não para o corte que eu fiz aqui.
  const csvDireto = argumento("csv", null);
  const rotulo = argumento("rotulo", arquivo);

  const t0 = Date.now();
  if (!csvDireto) await baixa(url, zip);
  const hash = sha256(zip);
  const mb = (fs.statSync(zip).size / 1024 / 1024).toFixed(0);
  console.log(`  ${mb} MB  ${hash.slice(0, 23)}…`);
  if (csvDireto) console.log(`  pedaço: ${rotulo}`);

  const cliente = conecta();
  await cliente.connect();

  // ⚠️ **Desligar o limite de tempo AQUI, e não só na configuração do cliente.**
  // A primeira versão passava `statement_timeout: 0` na criação do cliente e a
  // carga morreu assim mesmo, com "canceling statement due to statement
  // timeout" — o padrão do papel no Supabase venceu. Um COPY de milhões de
  // linhas é um comando só, e demora minutos por natureza.
  await cliente.query("set statement_timeout = 0");
  await cliente.query("set idle_in_transaction_session_timeout = 0");

  // ⚠️ **UM carregador por vez, garantido pelo banco.**
  //
  // Isto não é excesso de zelo: aconteceu em 20/08/2026. Dois carregadores
  // rodaram ao mesmo tempo — um deles um trabalho de fundo que eu dei como
  // encerrado sem conferir — e o resultado foi 4 milhões de linhas SEM
  // procedência.
  //
  // A causa é que a procedência entra por VALOR PADRÃO da coluna, e valor
  // padrão é estado da tabela, compartilhado: o carregador A define o padrão
  // dele, B define o dele por cima, A termina e APAGA o padrão — e o `COPY` de
  // B insere tudo com `carga_id` nulo. Trocar uma corrida por outra é fácil; o
  // que resolve de fato é não deixar os dois correrem.
  //
  // A trava é do banco, não do script: vale mesmo se alguém chamar o
  // carregador de outro terminal, de outra máquina ou por outro caminho.
  const TRAVA = 823_400_001; // número arbitrário e fixo, só para esta rotina
  const trava = await cliente.query("select pg_try_advisory_lock($1) as peguei", [TRAVA]);
  if (!trava.rows[0].peguei) {
    await cliente.end();
    throw new Error(
      "Já existe outra carga da Receita rodando neste banco. Espere ela terminar. " +
        "Duas cargas ao mesmo tempo deixam linhas sem procedência — aconteceu em 20/08/2026.",
    );
  }
  const conf = await cliente.query("show statement_timeout");
  console.log(`  limite de tempo por comando: ${conf.rows[0].statement_timeout}`);

  // ⚠️ **Trava contra carga repetida.** Sem ela, rodar o mesmo arquivo duas
  // vezes duplicaria as linhas em silêncio — e numa rede de ligações isso não é
  // "dado a mais", é conclusão errada: contagem de sócios e peso de vínculo
  // passam a mentir. O índice único no banco garante isso mesmo se alguém
  // chamar o script por outro caminho; aqui a mensagem só é mais clara.
  const jaFeita = await cliente.query(
    "select id, linhas, concluida_em from public.rf_carga where arquivo = $1 and mes_base = $2 and concluida_em is not null",
    // ⚠️ Pelo RÓTULO, não pelo nome do arquivo: cada pedaço precisa poder ser
    // carregado uma vez. Com o nome do arquivo, o segundo pedaço seria recusado
    // como se fosse repetição do primeiro.
    [rotulo, mes],
  );
  if (jaFeita.rows.length > 0) {
    const j = jaFeita.rows[0];
    if (!process.argv.includes("--refazer")) {
      throw new Error(
        `${arquivo} (${mes}) já foi carregado em ${j.concluida_em.toISOString()} com ${j.linhas} linhas. ` +
          "Para refazer, passe --refazer (as linhas daquela carga são apagadas antes).",
      );
    }
    console.log(`  --refazer: apagando as ${j.linhas} linhas da carga anterior…`);
    await cliente.query(`delete from public.${tabela} where carga_id = $1`, [j.id]);
    await cliente.query("delete from public.rf_carga where id = $1", [j.id]);
  }

  // ⚠️ **Linha sem procedência é dado órfão, e órfão não pode ser ignorado.**
  // Ele não aparece em nenhuma carga, então `--refazer` não o apaga e a próxima
  // carga o duplica. Isto existe porque aconteceu de verdade em 20/08/2026: um
  // COPY bem-sucedido cujo passo seguinte falhou deixou 2 milhões de linhas sem
  // dono. Parar aqui, e alto, é melhor que carregar por cima.
  const orfas = await cliente.query(
    `select count(*)::bigint as n from public.${tabela} where carga_id is null`,
  );
  if (Number(orfas.rows[0].n) > 0) {
    throw new Error(
      `${tabela} tem ${Number(orfas.rows[0].n).toLocaleString("pt-BR")} linhas SEM procedência (carga_id nulo), ` +
        "provavelmente de uma carga que morreu no meio. Carregar por cima duplicaria a rede. " +
        `Apague-as antes: delete from public.${tabela} where carga_id is null;`,
    );
  }

  const { rows } = await cliente.query(
    `insert into public.rf_carga (arquivo, tabela_destino, mes_base, origem_url, origem_tipo, content_hash)
     values ($1, $2, $3, $4, 'espelho', $5) returning id`,
    [rotulo, tabela, mes, url, hash],
  );
  const cargaId = rows[0].id;

  try {
    const csv = csvDireto ?? descompacta(zip, pasta);
    console.log(`  ${csvDireto ? "usando" : "descompactado"}: ${path.basename(csv)}`);

    const forceNull = NULOS[tabela]?.length ? `, force_null (${NULOS[tabela].join(", ")})` : "";
    // ⚠️ O Postgres faz o parsing do CSV, não o Node. Ele respeita aspas, `;`
    // dentro de campo e quebra de linha dentro de aspas — que um `split(';')`
    // em JavaScript quebraria em silêncio, corrompendo razão social.
    const sql =
      `copy public.${tabela} (${colunas.join(", ")}) from stdin ` +
      `with (format csv, delimiter ';', quote '"', encoding 'LATIN1'${forceNull})`;

    // ⚠️ **A procedência entra JUNTO com a linha, como valor padrão da coluna.**
    //
    // A primeira versão carregava e depois fazia `update ... set carga_id`. Em
    // 2 milhões de linhas esse update estourou o limite de tempo — e o
    // resultado foi o pior possível: **o COPY tinha dado certo**, as linhas
    // estavam lá, mas sem procedência, e a carga ficou registrada como ERRO.
    // Quem visse aquilo e rodasse `--refazer` apagaria "as linhas daquela
    // carga", que eram zero, e carregaria tudo de novo: 2 milhões de linhas
    // duplicadas, sem erro nenhum na tela.
    //
    // Com o valor padrão, não existe janela entre inserir e marcar: ou a linha
    // entra com procedência, ou não entra.
    await cliente.query(
      `alter table public.${tabela} alter column carga_id set default '${cargaId}'::uuid`,
    );
    try {
      console.log("  carregando…");
      await pipeline(fs.createReadStream(csv), cliente.query(copyFrom(sql)));
    } finally {
      await cliente.query(`alter table public.${tabela} alter column carga_id drop default`);
    }

    // ⚠️ Conta o que ENTROU, não o que o arquivo tinha. Status não é resultado.
    const c = await cliente.query(
      `select count(*)::bigint as n from public.${tabela} where carga_id = $1`,
      [cargaId],
    );
    const linhas = Number(c.rows[0].n);

    // ⚠️ **Zero linha de um arquivo cheio é FALHA, não conclusão.**
    //
    // Em 20/08/2026 uma carga imprimiu "✔ 0 linhas em 50s" para um arquivo de
    // 196 MB, e ficou registrada como concluída. É exatamente a regra deste
    // projeto: sucesso não é evidência. Um "✔" com zero é a pior das duas
    // mensagens possíveis — parece que deu certo, e o buraco na rede fica.
    const linhasNoArquivo = await contaLinhas(csv);
    if (linhas === 0 && linhasNoArquivo > 0) {
      throw new Error(
        `o arquivo tem ${linhasNoArquivo.toLocaleString("pt-BR")} linhas, mas ZERO entraram com esta procedência. ` +
          "Provável causa: outra carga rodando ao mesmo tempo trocou o valor padrão da coluna. " +
          "A carga fica registrada como não concluída, de propósito.",
      );
    }
    // ⚠️ Divergência entre o que o arquivo tinha e o que entrou também é falha:
    // carga pela metade que se parece com carga inteira deixa buraco invisível.
    if (linhas !== linhasNoArquivo) {
      throw new Error(
        `o arquivo tem ${linhasNoArquivo.toLocaleString("pt-BR")} linhas e entraram ${linhas.toLocaleString("pt-BR")}. ` +
          "A carga fica registrada como não concluída até alguém entender a diferença.",
      );
    }

    await cliente.query(
      "update public.rf_carga set concluida_em = now(), linhas = $1 where id = $2",
      [linhas, cargaId],
    );
    const seg = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`  ✔ ${Number(linhas).toLocaleString("pt-BR")} linhas em ${seg}s`);
  } catch (e) {
    await cliente.query("update public.rf_carga set erro = $1 where id = $2", [
      String(e.message).slice(0, 2000),
      cargaId,
    ]);
    throw e;
  } finally {
    await cliente.end();
  }
}

principal().catch((e) => {
  console.error(`FALHOU: ${e.message}`);
  process.exit(1);
});
