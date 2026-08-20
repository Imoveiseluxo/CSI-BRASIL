import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { FormularioEntrar } from "./formulario";

export const metadata = { title: "Entrar — CSI Brasil" };

export default async function EntrarPage() {
  // Quem já está logado não vê tela de login: vai direto para o workspace.
  const usuario = await getCurrentUser();
  if (usuario) redirect("/app/csi-brasil");

  return (
    <main className="centro">
      <div className="cartao">
        <h1>CSI Brasil</h1>
        <p className="fraco">Inteligência corporativa, mídia e fontes abertas.</p>
        <FormularioEntrar />
      </div>
    </main>
  );
}
