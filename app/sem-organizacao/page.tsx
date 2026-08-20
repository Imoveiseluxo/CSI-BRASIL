import { sairAction } from "@/lib/auth/actions";

export const metadata = { title: "Sem organização — CSI Brasil" };

/**
 * Onde cai quem tem login mas não pertence a nenhuma organização.
 *
 * ⚠️ Esta página existe porque a guarda precisava mandar a pessoa para algum
 * lugar, e mandar para uma rota inexistente daria **404** — que é a pior
 * resposta possível: não diz o que houve nem o que fazer.
 *
 * ⚠️ E ela **não oferece "criar organização"**: o CSI Brasil é operado pelo
 * dono, e quem libera acesso é ele. Botão de autoatendimento aqui contrariaria
 * o modelo de negócio.
 */
export default function SemOrganizacaoPage() {
  return (
    <main className="centro">
      <div className="cartao">
        <h1>Sem acesso a uma organização</h1>
        <p className="fraco">
          Sua conta existe, mas ainda não está vinculada a nenhuma organização. Quem libera o acesso
          é o operador da plataforma.
        </p>
        <form action={sairAction} style={{ marginTop: "1rem" }}>
          <button type="submit" className="discreto">
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
