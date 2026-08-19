/**
 * Dublê de `server-only` para os testes.
 *
 * `server-only` não é dependência declarada: quem resolve é o bundler do Next,
 * que troca o módulo por um que EXPLODE se o import vier de um Client Component.
 * Fora do Next — no vitest, que roda em Node puro — o pacote simplesmente não
 * existe, e todo arquivo que o importa deixa de carregar.
 *
 * Este dublê é vazio de propósito: no teste o import não faz nada, e no build do
 * Next a trava de verdade continua valendo.
 *
 * Extraído do Bahia Realty (16/08/2026), onde a ausência dele derrubava 19
 * arquivos de teste que nada tinham a ver com a trava.
 */
export {};
