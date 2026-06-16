import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "../firebase/config.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";

const OBRAS_COLLECTION = "obras";
const CAPITULOS_COLLECTION = "capitulos";

function simplificarTexto(texto = "") {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b0+(\d+)\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizar(texto = "") {
  return simplificarTexto(texto)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function distanciaLevenshtein(a = "", b = "") {
  const textoA = simplificarTexto(a);
  const textoB = simplificarTexto(b);

  if (textoA === textoB) return 0;
  if (!textoA) return textoB.length;
  if (!textoB) return textoA.length;

  const matriz = Array.from({ length: textoA.length + 1 }, (_, i) => [i]);

  for (let j = 1; j <= textoB.length; j += 1) {
    matriz[0][j] = j;
  }

  for (let i = 1; i <= textoA.length; i += 1) {
    for (let j = 1; j <= textoB.length; j += 1) {
      const custo = textoA[i - 1] === textoB[j - 1] ? 0 : 1;

      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + custo
      );
    }
  }

  return matriz[textoA.length][textoB.length];
}

function similaridadeAproximada(a = "", b = "") {
  const textoA = simplificarTexto(a);
  const textoB = simplificarTexto(b);

  if (!textoA || !textoB) return 0;
  if (textoA === textoB) return 1;

  const maior = Math.max(textoA.length, textoB.length);
  if (maior === 0) return 0;

  const distancia = distanciaLevenshtein(textoA, textoB);

  return Math.max(0, 1 - distancia / maior);
}

function calcularSimilaridadeTokens(textoA = "", textoB = "") {
  const a = simplificarTexto(textoA);
  const b = simplificarTexto(textoB);

  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const tokensA = new Set(tokenizar(a));
  const tokensB = new Set(tokenizar(b));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersecao = 0;

  tokensA.forEach((tokenA) => {
    if (tokensB.has(tokenA)) {
      intersecao += 1;
      return;
    }

    const parecido = [...tokensB].some(
      (tokenB) => similaridadeAproximada(tokenA, tokenB) >= 0.78
    );

    if (parecido) {
      intersecao += 1;
    }
  });

  const uniao = new Set([...tokensA, ...tokensB]).size;

  return intersecao / uniao;
}

function calcularSimilaridadeGeral(textoA = "", textoB = "") {
  return Math.max(
    calcularSimilaridadeTokens(textoA, textoB),
    similaridadeAproximada(textoA, textoB)
  );
}

function extrairNumero(texto = "") {
  const normalizado = simplificarTexto(texto);

  const matchCapitulo = normalizado.match(
    /(?:capitulo|cap|parte|episodio|ep)\s*(\d+)/
  );

  if (matchCapitulo?.[1]) return Number(matchCapitulo[1]);

  const matchNumeroSolto = normalizado.match(/^0*(\d+)$/);

  if (matchNumeroSolto?.[1]) return Number(matchNumeroSolto[1]);

  const matchPrimeiroNumero = normalizado.match(/\b0*(\d+)\b/);

  if (matchPrimeiroNumero?.[1]) return Number(matchPrimeiroNumero[1]);

  return null;
}

function numeroDoCapitulo(capitulo = {}) {
  const numeroTitulo = extrairNumero(capitulo.titulo || "");
  const ordem = Number(capitulo.ordem || 0);

  return {
    titulo: Number.isFinite(numeroTitulo) ? numeroTitulo : null,
    ordem: Number.isFinite(ordem) && ordem > 0 ? ordem : null
  };
}

function capituloCombinaComNumero(capitulo = {}, numeroBusca = null) {
  if (!numeroBusca) return true;

  const numero = numeroDoCapitulo(capitulo);

  return numero.ordem === numeroBusca || numero.titulo === numeroBusca;
}

function limparTituloParaComparacao(texto = "") {
  return simplificarTexto(texto)
    .replace(/^(capitulo|cap|parte|episodio|ep)\s*\d+\s*/i, "")
    .replace(/^\d+\s*[-–—:.]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pontuarCapitulo(capitulo, textoBusca = "") {
  const titulo = capitulo.titulo || "";
  const buscaNormalizada = simplificarTexto(textoBusca);
  const tituloNormalizado = simplificarTexto(titulo);

  if (!buscaNormalizada || !tituloNormalizado) return 0;
  if (buscaNormalizada === tituloNormalizado) return 100;

  const numeroBusca = extrairNumero(textoBusca);
  const numeroCapitulo = numeroDoCapitulo(capitulo);

  if (numeroBusca && !capituloCombinaComNumero(capitulo, numeroBusca)) {
    return 0;
  }

  let pontos = 0;

  if (numeroBusca) {
    if (numeroCapitulo.ordem === numeroBusca) pontos += 100;
    if (numeroCapitulo.titulo === numeroBusca) pontos += 95;
  }

  if (
    tituloNormalizado.includes(buscaNormalizada) ||
    buscaNormalizada.includes(tituloNormalizado)
  ) {
    pontos += 75;
  }

  const tituloLimpo = limparTituloParaComparacao(titulo);
  const buscaLimpa = limparTituloParaComparacao(textoBusca);

  if (tituloLimpo && buscaLimpa) {
    if (tituloLimpo === buscaLimpa) pontos += 70;

    if (tituloLimpo.includes(buscaLimpa) || buscaLimpa.includes(tituloLimpo)) {
      pontos += 65;
    }

    pontos += calcularSimilaridadeGeral(tituloLimpo, buscaLimpa) * 70;
  }

  pontos += calcularSimilaridadeGeral(titulo, textoBusca) * 50;

  const tokensBusca = tokenizar(textoBusca);
  const tokensTitulo = tokenizar(titulo);

  const tokensImportantesEncontrados = tokensBusca.filter((tokenBusca) =>
    tokensTitulo.some(
      (tokenTitulo) =>
        tokenTitulo.includes(tokenBusca) ||
        tokenBusca.includes(tokenTitulo) ||
        similaridadeAproximada(tokenBusca, tokenTitulo) >= 0.78
    )
  ).length;

  pontos += tokensImportantesEncontrados * 20;

  return pontos;
}

function gerarIdCapitulo(capitulo, index = 0) {
  if (capitulo.id) return String(capitulo.id);
  if (capitulo.wattpadId) return String(capitulo.wattpadId);

  const baseTitulo = normalizarTexto(capitulo.titulo || `capitulo-${index + 1}`)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const ordem = Number(capitulo.ordem || index + 1);

  return `${String(ordem).padStart(4, "0")}-${baseTitulo || "capitulo"}`;
}

function limparDadosCapitulo(capitulo = {}, index = 0) {
  const titulo = capitulo.titulo || `Capítulo ${index + 1}`;

  return {
    wattpadId: capitulo.wattpadId || "",
    titulo,
    tituloNormalizado: normalizarTexto(titulo),
    link: capitulo.link || "",
    palavras: Number(capitulo.palavras || 0),
    paragrafos: Number(capitulo.paragrafos || 0),
    comentariosTotais: Number(capitulo.comentariosTotais || 0),
    distribuicaoComentarios: capitulo.distribuicaoComentarios || {
      inicio: 0,
      meio: 0,
      fim: 0,
      geral: 0
    },
    ordem: Number(capitulo.ordem || index + 1),
    tipo: capitulo.tipo || "Normal",
    atualizadoEm: serverTimestamp()
  };
}

function encontrarCapituloExistente(capitulos = [], capituloNovo = {}) {
  if (capituloNovo.id) {
    const porId = capitulos.find(
      (capitulo) => String(capitulo.id) === String(capituloNovo.id)
    );

    if (porId) return porId;
  }

  if (capituloNovo.wattpadId) {
    const porWattpadId = capitulos.find(
      (capitulo) =>
        String(capitulo.wattpadId || capitulo.id) ===
        String(capituloNovo.wattpadId)
    );

    if (porWattpadId) return porWattpadId;
  }

  const tituloNovo = normalizarTexto(capituloNovo.titulo || "");

  if (tituloNovo) {
    const porTituloExato = capitulos.find(
      (capitulo) => normalizarTexto(capitulo.titulo || "") === tituloNovo
    );

    if (porTituloExato) return porTituloExato;

    const candidatos = capitulos
      .map((capitulo) => ({
        capitulo,
        pontos: pontuarCapitulo(capitulo, capituloNovo.titulo || "")
      }))
      .sort((a, b) => b.pontos - a.pontos);

    if (candidatos[0]?.pontos >= 80) {
      return candidatos[0].capitulo;
    }
  }

  return null;
}

export async function salvarCapituloDaObra(obraId, capitulo, index = 0) {
  const capitulosExistentes = await listarCapitulosDaObra(obraId);
  const existente = encontrarCapituloExistente(capitulosExistentes, capitulo);

  const capituloId = existente?.id || gerarIdCapitulo(capitulo, index);

  const ref = doc(
    db,
    OBRAS_COLLECTION,
    obraId,
    CAPITULOS_COLLECTION,
    capituloId
  );

  await setDoc(ref, limparDadosCapitulo(capitulo, index), { merge: true });

  return capituloId;
}

export async function salvarCapitulosDaObra(obraId, capitulos = []) {
  const capitulosExistentes = await listarCapitulosDaObra(obraId);
  const resultado = {
    criados: 0,
    atualizados: 0,
    total: capitulos.length
  };

  for (let index = 0; index < capitulos.length; index += 1) {
    const capitulo = capitulos[index];
    const existente = encontrarCapituloExistente(capitulosExistentes, capitulo);
    const capituloId = existente?.id || gerarIdCapitulo(capitulo, index);

    const ref = doc(
      db,
      OBRAS_COLLECTION,
      obraId,
      CAPITULOS_COLLECTION,
      capituloId
    );

    await setDoc(
      ref,
      limparDadosCapitulo(
        {
          ...capitulo,
          ordem: capitulo.ordem || existente?.ordem || index + 1,
          tipo: capitulo.tipo || existente?.tipo || "Normal"
        },
        index
      ),
      { merge: true }
    );

    if (existente) {
      resultado.atualizados += 1;
    } else {
      resultado.criados += 1;
    }
  }

  return resultado;
}

export async function atualizarCapituloDaObra(obraId, capituloId, dados) {
  const ref = doc(
    db,
    OBRAS_COLLECTION,
    obraId,
    CAPITULOS_COLLECTION,
    capituloId
  );

  const dadosLimpos = {
    ...dados,
    atualizadoEm: serverTimestamp()
  };

  if (dados.titulo !== undefined) {
    dadosLimpos.tituloNormalizado = normalizarTexto(dados.titulo || "");
  }

  Object.keys(dadosLimpos).forEach((chave) => {
    if (dadosLimpos[chave] === undefined) {
      delete dadosLimpos[chave];
    }
  });

  await setDoc(ref, dadosLimpos, { merge: true });
}

export async function atualizarDetalhesCapitulo(obraId, capituloId, detalhes) {
  await atualizarCapituloDaObra(obraId, capituloId, {
    wattpadId: detalhes.capituloId || "",
    palavras: Number(detalhes.palavras || 0),
    paragrafos: Number(detalhes.paragrafos || 0),
    comentariosTotais: Number(
      detalhes.comentariosTotaisCapitulo ||
        detalhes.comentariosTotais ||
        0
    ),
    distribuicaoComentarios: detalhes.distribuicaoComentarios || {
      inicio: 0,
      meio: 0,
      fim: 0,
      geral: 0
    },
    paragrafosDetalhados: detalhes.paragrafosDetalhados || []
  });
}

export async function listarCapitulosDaObra(obraId) {
  const ref = collection(db, OBRAS_COLLECTION, obraId, CAPITULOS_COLLECTION);
  const q = query(ref, orderBy("ordem", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function excluirCapitulo(obraId, capituloId) {
  const ref = doc(db, OBRAS_COLLECTION, obraId, CAPITULOS_COLLECTION, capituloId);
  await deleteDoc(ref);
}

export function encontrarCapituloPorTexto(capitulos = [], texto = "") {
  const textoNormalizado = simplificarTexto(texto);
  const numeroBusca = extrairNumero(texto);

  if (!textoNormalizado) return null;

  const capitulosElegiveis = numeroBusca
    ? capitulos.filter((capitulo) =>
        capituloCombinaComNumero(capitulo, numeroBusca)
      )
    : capitulos;

  if (numeroBusca && capitulosElegiveis.length === 0) {
    return null;
  }

  const candidatos = capitulosElegiveis
    .map((capitulo) => ({
      capitulo,
      pontos: pontuarCapitulo(capitulo, texto)
    }))
    .sort((a, b) => b.pontos - a.pontos);

  const melhor = candidatos[0];

  if (!melhor) return null;

  if (melhor.pontos >= (numeroBusca ? 80 : 45)) {
    return melhor.capitulo;
  }

  return null;
}
