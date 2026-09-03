import { normalizarTexto } from "./normalizarTexto.js";

export const LIMITE_PALAVRAS_CAPITULO_ESPECIAL = 900;

export function classificarTipoCapitulo({
  titulo = "",
  palavras = 0,
  tipoAtual = ""
} = {}) {
  const tituloNormalizado = normalizarTexto(titulo);
  const totalPalavras = Number(palavras || 0);
  const ehPrologo = /\bprologo\b/.test(tituloNormalizado);
  const ehCapituloExplicito =
    /\b(?:cap(?:itulo|itulos)?|parte|episodio(?:s)?|ep)\b/.test(
      tituloNormalizado
    );
  const ehCurto =
    Number.isFinite(totalPalavras) &&
    totalPalavras > 0 &&
    totalPalavras < LIMITE_PALAVRAS_CAPITULO_ESPECIAL;

  if (ehPrologo || (ehCurto && !ehCapituloExplicito)) {
    return "Especial";
  }

  if (ehCapituloExplicito) {
    return "Normal";
  }

  if (tipoAtual) {
    return tipoAtual;
  }

  if (
    tituloNormalizado.includes("poesia") ||
    tituloNormalizado.includes("poema")
  ) {
    return "Poesia";
  }

  if (tituloNormalizado.includes("especial")) {
    return "Especial";
  }

  return "Normal";
}
