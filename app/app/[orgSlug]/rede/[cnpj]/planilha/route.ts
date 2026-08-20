import { requireOrgMember } from "@/lib/auth/guards";
import { montaCsv, nomeDeArquivoSeguro } from "@/lib/exportacao/csv";
import {
  empresaDeReferencia,
  type Ligacao,
  ligacoesPorCnpj,
  procedenciaDaBase,
  raizDoCnpj,
} from "@/lib/rede/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * A rede em planilha.
 *
 * ⚠️ **Uma linha por LIGAÇÃO, não por empresa.** É a ligação que responde à
 * pergunta "o que liga isto àquilo" — uma planilha de empresas soltas obrigaria
 * quem recebe a refazer o raciocínio na mão.
 *
 * ⚠️ **Cada linha carrega a procedência**: de qual base, de qual mês, de qual
 * endereço e com que impressão digital. Planilha sem isso é dado solto; com
 * isso, é prova — e é a diferença que o book cobra.
 *
 * ⚠️ **E cada linha carrega a CERTEZA.** Ligação por sócio pessoa física é
 * casada com CPF mascarado; ela é provável, não provada. Sair sem essa etiqueta
 * transformaria uma probabilidade em afirmação assim que o arquivo saísse
 * daqui — e planilha circula.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; cnpj: string }> },
) {
  const { orgSlug, cnpj } = await params;
  await requireOrgMember({ orgSlug });

  const raiz = raizDoCnpj(cnpj);
  if (!raiz) {
    return new Response("CNPJ inválido.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const supabase = await createClient();
  const [empresa, ligacoes, cargas] = await Promise.all([
    empresaDeReferencia(supabase, raiz),
    ligacoesPorCnpj(supabase, raiz, 2, 2000),
    procedenciaDaBase(supabase),
  ]);

  const base = cargas[0];
  const rotuloCerteza: Record<string, string> = {
    confirmada: "confirmada",
    provavel: "provável (casada por nome + CPF parcial)",
    possivel: "possível",
  };

  const csv = montaCsv<Ligacao>(ligacoes, [
    { cabecalho: "saltos da origem", valor: (l) => l.salto },
    { cabecalho: "empresa de origem", valor: (l) => l.origemNome ?? "(sem razão social na base)" },
    { cabecalho: "CNPJ raiz origem", valor: (l) => l.origemCnpj },
    { cabecalho: "vínculo", valor: (l) => l.vinculo },
    { cabecalho: "por meio de", valor: (l) => l.socioNome ?? "" },
    { cabecalho: "qualificação", valor: (l) => l.qualificacao ?? "" },
    { cabecalho: "empresa ligada", valor: (l) => l.destinoNome ?? "(sem razão social na base)" },
    { cabecalho: "CNPJ raiz ligada", valor: (l) => l.destinoCnpj },
    { cabecalho: "certeza", valor: (l) => rotuloCerteza[l.certeza] ?? l.certeza },
    { cabecalho: "por que", valor: (l) => l.motivo },
    // A procedência, repetida em cada linha de propósito: planilha é recortada,
    // colada e reordenada, e a origem tem de sobreviver a isso.
    { cabecalho: "fonte", valor: () => "Base pública de CNPJ — Receita Federal" },
    { cabecalho: "obtida de", valor: () => base?.origemUrl ?? "" },
    { cabecalho: "tipo da origem", valor: () => base?.origemTipo ?? "" },
    { cabecalho: "mês da base", valor: () => base?.mesBase ?? "" },
    { cabecalho: "impressão digital do arquivo", valor: () => base?.contentHash ?? "" },
  ]);

  const nome = nomeDeArquivoSeguro(`rede-${empresa?.razaoSocial ?? raiz}-${raiz}`);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nome}.csv"`,
      // ⚠️ Rede muda quando a base é atualizada. Guardar em cache entregaria
      // uma planilha velha com cara de nova.
      "cache-control": "no-store",
    },
  });
}
