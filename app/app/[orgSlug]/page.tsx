import { sairAction } from "@/lib/auth/actions";
import { requireOrgMember } from "@/lib/auth/guards";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { FormularioConsulta } from "./formulario";

export const metadata = { title: "CSI Brasil" };

type Props = { params: Promise<{ orgSlug: string }> };

/**
 * A primeira tela real do produto.
 *
 * ⚠️ Ela mostra a empresa **junto com a procedência**, e não em uma aba
 * escondida. É a diferença que o book cobra: *"dado na tela sem origem
 * rastreável"* é proibido, e uma ficha bonita sem a origem ao lado seria
 * exatamente isso.
 */
export default async function WorkspacePage({ params }: Props) {
  const { orgSlug } = await params;
  const { org, role, user } = await requireOrgMember({ orgSlug });

  const supabase = await createClient();
  const { data: empresas } = await supabase
    .from("companies")
    .select(
      "id, cnpj, razao_social, nome_fantasia, situacao, uf, municipio, cnae_principal, capital_social, confidence, produced_by_kind, produced_at, evidence:evidence!companies_evidence_mesma_org(collected_at, content_hash), source:sources!companies_source_mesma_org(name)",
    )
    .eq("organization_id", org.id)
    .order("produced_at", { ascending: false })
    .limit(25);

  return (
    <main className="pagina">
      <header className="topo">
        <div>
          <h1>{org.name}</h1>
          <p className="fraco">
            {user.email} · {ROLE_LABELS[role]}
          </p>
        </div>
        <form action={sairAction}>
          <button type="submit" className="discreto">
            Sair
          </button>
        </form>
      </header>

      <section className="bloco">
        <h2>Consultar empresa por CNPJ</h2>
        <p className="fraco">
          A consulta guarda o que a fonte respondeu antes de interpretar. Nada aparece aqui sem
          apontar de onde veio.
        </p>
        <FormularioConsulta orgSlug={orgSlug} />
      </section>

      <section className="bloco">
        <h2>Empresas ({empresas?.length ?? 0})</h2>

        {!empresas || empresas.length === 0 ? (
          <p className="fraco">
            Nenhuma ainda. Consulte um CNPJ acima — por exemplo <code>33.000.167/0001-01</code>.
          </p>
        ) : (
          <ul className="lista">
            {empresas.map((e) => {
              const ev = e.evidence as unknown as {
                collected_at: string;
                content_hash: string;
              } | null;
              const fonte = e.source as unknown as { name: string } | null;
              return (
                <li key={e.id} className="ficha">
                  <div className="ficha-cabeca">
                    <strong>{e.razao_social}</strong>
                    {e.situacao ? <span className="etiqueta">{e.situacao}</span> : null}
                  </div>
                  <div className="fraco">
                    {e.nome_fantasia ? `${e.nome_fantasia} · ` : ""}
                    {e.cnpj}
                    {e.municipio ? ` · ${e.municipio}` : ""}
                    {e.uf ? `/${e.uf}` : ""}
                  </div>

                  {/* ⚠️ A procedência fica AQUI, ao lado do dado — não numa aba. */}
                  <div className="procedencia">
                    <span>
                      fonte: <strong>{fonte?.name ?? "—"}</strong>
                    </span>
                    <span>
                      coletado:{" "}
                      {ev?.collected_at
                        ? new Date(ev.collected_at).toLocaleString("pt-BR", {
                            timeZone: "America/Bahia",
                          })
                        : "—"}
                    </span>
                    <span>
                      confiança:{" "}
                      {e.confidence === null ? (
                        // ⚠️ "não informado", nunca um número inventado.
                        <em>não informado</em>
                      ) : (
                        `${Math.round(Number(e.confidence) * 100)}%`
                      )}
                    </span>
                    <span>por: {e.produced_by_kind}</span>
                    <span className="hash" title={ev?.content_hash ?? ""}>
                      {ev?.content_hash ? `${ev.content_hash.slice(0, 22)}…` : "sem evidência"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
