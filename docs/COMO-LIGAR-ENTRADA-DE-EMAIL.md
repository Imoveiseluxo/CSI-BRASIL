# Como ligar a entrada de e-mail (Cloudflare Email Routing)

> **Estado em 19/08/2026:** o lado do CSI Brasil está **pronto e testado em produção**.
> O que falta é externo, e depende do dono. Este documento é o passo a passo.

## O que já funciona

| | |
|---|---|
| Rota | `POST https://csi-brasil.vercel.app/api/entrada/email` |
| Autenticação | token da fonte no cabeçalho `Authorization: Bearer …` |
| Organização | `CSI Brasil` (criada em 19/08/2026) |
| Fonte | `E-mail encaminhado` |

**Medido em produção**, com o deploy no ar:

```
sem token          -> 401
token errado       -> 401
sem remetente      -> 400  "E-mail sem remetente — não dá para registrar a origem."
e-mail de verdade  -> 201  evidência gravada, com hash
```

O token está em `C:\Users\Windows\token-entrada-email-csi.txt` — **única cópia**, porque o
banco guarda só o hash.

---

## O que falta, e por que só você pode fazer

**Um domínio.** Hoje o CSI está em `csi-brasil.vercel.app`, e endereço de e-mail precisa de
domínio próprio. O Cloudflare Email Routing exige que o DNS do domínio esteja na Cloudflare.

**Uma conta Cloudflare** com esse domínio.

---

## Passo a passo

### 1. Domínio na Cloudflare

Registre (ou aponte um que já tenha) para a Cloudflare — o plano gratuito serve. Espere o
domínio ficar **Active**.

### 2. Ligar o Email Routing

No painel do domínio → **Email** → **Email Routing** → **Enable**. A Cloudflare cria sozinha
os registros MX necessários.

### 3. Criar o Worker que entrega para nós

**Workers & Pages → Create → Worker**, e cole o código abaixo. Ele recebe o e-mail e chama a
nossa rota.

```js
export default {
  async email(message, env) {
    // Lê o corpo do e-mail inteiro, cru.
    const bruto = new Response(message.raw);
    const texto = await bruto.text();

    const r = await fetch("https://csi-brasil.vercel.app/api/entrada/email", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.TOKEN_CSI}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.headers.get("subject"),
        messageId: message.headers.get("message-id"),
        text: texto,
      }),
    });

    // ⚠️ Se a nossa rota recusar, NÃO engula: deixe o erro subir. E-mail que
    // some em silêncio é a pior falha possível numa entrada de dado — foi
    // exatamente assim que 82 leads se perderam no outro projeto do dono.
    if (!r.ok) {
      throw new Error(`CSI recusou: HTTP ${r.status} ${await r.text()}`);
    }
  },
};
```

### 4. Guardar o token no Worker

No Worker → **Settings → Variables → Add variable**:

- Nome: `TOKEN_CSI`
- Valor: o token do arquivo `token-entrada-email-csi.txt`
- **Marque como *Encrypt*** — sem isso ele fica legível no painel

### 5. Apontar um endereço para o Worker

**Email Routing → Routes → Create address**: crie por exemplo
`coleta@seudominio.com.br` e, em *Action*, escolha **Send to a Worker** → o Worker do passo 3.

### 6. Provar que funciona — e essa parte não é opcional

Mande um e-mail de verdade para `coleta@seudominio.com.br` e **me avise**. Eu confiro no
banco se a evidência entrou, com o remetente e o hash certos.

⚠️ **"Configurei" não é prova.** No outro projeto do dono, hoje mesmo, um portal entregava
lead por e-mail há semanas sem que nada os registrasse — e ninguém sabia.

---

## Depois de configurar

- **Apague** `token-entrada-email-csi.txt`. Ele já estará dentro do Worker.
- Encaminhe para `coleta@…` o que interessar monitorar. Cada e-mail vira **evidência com
  hash**, guardada crua antes de qualquer interpretação.

⚠️ **O que ainda NÃO existe:** nada lê essas evidências para virar conhecimento pesquisável.
A entrada está pronta; a interpretação do conteúdo de e-mail é a fatia seguinte.
