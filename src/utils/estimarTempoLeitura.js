export function estimarTempoLeitura(
  totalPalavras = 0,
  palavrasPorMinuto = 200
) {
  if (!totalPalavras || totalPalavras <= 0) {
    return 0;
  }

  return Math.ceil(totalPalavras / palavrasPorMinuto);
}