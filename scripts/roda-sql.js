/**
 * Roda um arquivo .sql direto no banco, **sem limite de tempo**.
 *
 * Uso:  PGPASS=... node scripts/roda-sql.js scripts/indices-receita.sql
 *
 * ⚠️ **Existe porque a API de SQL do Supabase tem limite de tempo por
 * comando.** Criar um índice em 28 milhões de linhas leva minutos e morre lá
 * com `canceling statement due to statement timeout` — medido em 20/08/2026,
 * quando até um `select` de tamanho de tabela estourou enquanto o banco estava
 * carregado.
 *
 * ⚠️ **Verificação de certificado LIGADA, com a CA do Supabase fixada.** Esta
 * conexão carrega a senha do banco; desligar a checagem seria abrir a porta
 * para alguém no meio do caminho justamente aqui.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const REF = "mmgucspxrfxdcztkrklb";

async function principal() {
  const arquivo = process.argv[2];
  if (!arquivo) {
    console.log("uso: node scripts/roda-sql.js <arquivo.sql>");
    process.exit(1);
  }
  const senha = process.env.PGPASS;
  if (!senha) {
    throw new Error(
      "Falta a variável PGPASS com a senha do banco. Ela está em senha-banco-csi-brasil.txt.",
    );
  }

  const sql = fs.readFileSync(arquivo, "utf8");
  const ca = fs.readFileSync(path.join(process.cwd(), "supabase/prod-ca-2021.crt"), "utf8");

  const cliente = new Client({
    host: `db.${REF}.supabase.co`,
    port: 5432,
    user: "postgres",
    password: senha,
    database: "postgres",
    ssl: { ca, rejectUnauthorized: true },
    statement_timeout: 0,
    query_timeout: 0,
  });

  await cliente.connect();
  await cliente.query("set statement_timeout = 0");

  const t0 = Date.now();
  const resultado = await cliente.query(sql);
  const seg = ((Date.now() - t0) / 1000).toFixed(0);

  // ⚠️ Imprime o resultado do ÚLTIMO comando: é onde os arquivos deste projeto
  // põem o `select` de conferência. Sem isso, "rodou" seria a única informação
  // — e "rodou" não diz o que mudou no mundo.
  const ultimo = Array.isArray(resultado) ? resultado[resultado.length - 1] : resultado;
  if (ultimo?.rows?.length) console.log(JSON.stringify(ultimo.rows, null, 1));
  console.log(`  concluído em ${seg}s`);

  await cliente.end();
}

principal().catch((e) => {
  console.error(`FALHOU: ${e.message}`);
  process.exit(1);
});
