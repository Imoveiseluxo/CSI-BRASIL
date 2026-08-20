import Link from "next/link";
import { sairAction } from "@/lib/auth/actions";
import { requireOrgMember } from "@/lib/auth/guards";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { busca } from "@/lib/busca/queries";
import { createClient } from "@/lib/supabase/server";
import { FormularioConsulta } from "./formulario";

export const metadata = { title: "CSI Brasil" };

type Props = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string }>;
};

/**
 * A primeira tela real do produto.
 *
 * ⚠️ Ela mostra a empresa **junto com a procedência**, e não em uma aba
 * escondida. É a diferença que o book cobra: *"dado na tela sem origem
 * rastreável"* é proibido, e uma ficha bonita sem a origem ao lado seria
 * exatamente isso.
 */
export default async function WorkspacePage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const { q } = await searchParams;
  const { org, role, user } = await requireOrgMember({ orgSlug });

  const supabase = await createClient();
  // ⚠️ O termo fica na URL de propósito: assim a busca sobrevive ao F5 e o link
  // pode ser guardado ou mandado para alguém.
  const achados = q ? await busca(supabase, org.id, q) : null;

  const { data: empresas } = await supabase
    .from("companies")
    .select(
      "id, cnpj, razao_social, nome_fantasia, situacao, uf, municipio, cnae_principal, capital_social, confidence, produced_by_kind, produced_at, evidence_id, evidence:evidence!companies_evidence_mesma_org(collected_at, content_hash), source:sources!companies_source_mesma_org(name)",
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
        <h2>Buscar no que já foi coletado</h2>
        <p className="fraco">
          Procura em empresas e nos artefatos brutos guardados. Cada resultado mostra de onde veio.
        </p>
        <form className="linha" action={`/app/${orgSlug}`}>
          <label htmlFor="q" className="oculto">
            Termo
          </label>
          <input id="q" name="q" defaultValue={q ?? ""} placeholder="razão social, cidade, CNPJ…" />
          <button type="submit">Buscar</button>
        </form>

        {achados ? (
          achados.length === 0 ? (
            <p className="fraco">Nada encontrado para “{q}”.</p>
          ) : (
            <ul className="lista">
              {achados.map((a) => (
                <li key={`${a.tipo}-${a.id}`} className="ficha">
                  <div className="ficha-cabeca">
                    {a.tipo === "evidencia" ? (
                      <Link href={`/app/${orgSlug}/evidencia/${a.id}`}>
                        <strong>{a.titulo}</strong>
                      </Link>
                    ) : (
                      <strong>{a.titulo}</strong>
                    )}
                    <span className="etiqueta">{a.tipo}</span>
                  </div>
                  <div className="fraco">{a.detalhe}</div>
                  <div className="procedencia">
                    <span>fonte: {a.fonte ?? "—"}</span>
                    <span>
                      coletado:{" "}
                      {a.coletadoEm
                        ? new Date(a.coletadoEm).toLocaleString("pt-BR", {
                            timeZone: "America/Bahia",
                          })
                        : "—"}
                    </span>
                    <span>
                      confiança:{" "}
                      {a.confianca === null ? (
                        <em>não informado</em>
                      ) : (
                        `${Math.round(a.confianca * 100)}%`
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

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
                    {/* ⚠️ O hash e' o link: quem duvida do dado clica e ve o
                        artefato bruto. Procedencia que nao pode ser aberta e'
                        afirmacao, nao evidencia. */}
                    {e.evidence_id ? (
                      <Link
                        href={`/app/${orgSlug}/evidencia/${e.evidence_id}`}
                        className="hash"
                        title="Abrir a evidência"
                      >
                        {ev?.content_hash ? `${ev.content_hash.slice(0, 22)}…` : "ver evidência"}
                      </Link>
                    ) : (
                      <span className="hash">sem evidência</span>
                    )}
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
