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

function limparTituloParaComparacao(texto = "") {
  return simplificarTexto(texto)
    .replace(/^(capitulo|cap|parte|episodio|ep)\s*\d+\s*/i, "")
    .replace(/^\d+\s*[-–—:.]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizar(texto = "") {
  return simplificarTexto(texto)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function calcularSimilaridade(textoA = "", textoB = "") {
  const a = simplificarTexto(textoA);
  const b = simplificarTexto(textoB);

  if (!a || !b) return 0;
  if (a === b) return 1;

  if (a.includes(b) || b.includes(a)) return 0.9;

  const tokensA = new Set(tokenizar(a));
  const tokensB = new Set(tokenizar(b));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersecao = 0;

  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersecao += 1;
  });

  const uniao = new Set([...tokensA, ...tokensB]).size;

  return intersecao / uniao;
}

function pontuarCapitulo(capitulo, textoBusca = "") {
  const titulo = capitulo.titulo || "";
  const buscaNormalizada = simplificarTexto(textoBusca);
  const tituloNormalizado = simplificarTexto(titulo);

  if (!buscaNormalizada || !tituloNormalizado) return 0;

  if (buscaNormalizada === tituloNormalizado) return 100;

  const numeroBusca = extrairNumero(textoBusca);
  const numeroTitulo = extrairNumero(titulo);
  const ordem = Number(capitulo.ordem || 0);

  let pontos = 0;

  if (numeroBusca) {
    if (ordem === numeroBusca) pontos += 80;
    if (numeroTitulo === numeroBusca) pontos += 75;
  }

  if (
    tituloNormalizado.includes(buscaNormalizada) ||
    buscaNormalizada.includes(tituloNormalizado)
  ) {
    pontos += 60;
  }

  const tituloLimpo = limparTituloParaComparacao(titulo);
  const buscaLimpa = limparTituloParaComparacao(textoBusca);

  if (tituloLimpo && buscaLimpa) {
    if (tituloLimpo === buscaLimpa) pontos += 55;

    if (tituloLimpo.includes(buscaLimpa) || buscaLimpa.includes(tituloLimpo)) {
      pontos += 45;
    }

    pontos += calcularSimilaridade(tituloLimpo, buscaLimpa) * 40;
  }

  pontos += calcularSimilaridade(titulo, textoBusca) * 30;

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

export async function salvarCapituloDaObra(obraId, capitulo, index = 0) {
  const capituloId = gerarIdCapitulo(capitulo, index);

  const ref = doc(
    db,
    OBRAS_COLLECTION,
    obraId,
    CAPITULOS_COLLECTION,
    capituloId
  );

  await setDoc(
    ref,
    {
      wattpadId: capitulo.wattpadId || "",
      titulo: capitulo.titulo || "",
      tituloNormalizado: normalizarTexto(capitulo.titulo || ""),
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
    },
    { merge: true }
  );

  return capituloId;
}

export async function salvarCapitulosDaObra(obraId, capitulos = []) {
  const promessas = capitulos.map((capitulo, index) =>
    salvarCapituloDaObra(
      obraId,
      {
        ...capitulo,
        ordem: capitulo.ordem || index + 1
      },
      index
    )
  );

  await Promise.all(promessas);
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

  if (!textoNormalizado) return null;

  const candidatos = capitulos
    .map((capitulo) => ({
      capitulo,
      pontos: pontuarCapitulo(capitulo, texto)
    }))
    .sort((a, b) => b.pontos - a.pontos);

  const melhor = candidatos[0];

  if (!melhor) return null;

  if (melhor.pontos >= 45) {
    return melhor.capitulo;
  }

  return null;
}