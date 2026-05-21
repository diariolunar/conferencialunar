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

function extrairNumero(texto = "") {
  const normalizado = normalizarTexto(texto);

  const matchCapitulo = normalizado.match(
    /(?:capitulo|cap|parte|episodio)\s*(\d+)/
  );

  if (matchCapitulo?.[1]) return Number(matchCapitulo[1]);

  const matchNumeroSolto = normalizado.match(/^(\d+)$/);

  if (matchNumeroSolto?.[1]) return Number(matchNumeroSolto[1]);

  return null;
}

function limparTituloParaComparacao(texto = "") {
  return normalizarTexto(texto)
    .replace(/^(capitulo|cap|parte|episodio)\s*\d+\s*/i, "")
    .replace(/^\d+\s*[-–—:.]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calcularSimilaridade(textoA = "", textoB = "") {
  const palavrasA = new Set(
    limparTituloParaComparacao(textoA).split(" ").filter(Boolean)
  );

  const palavrasB = new Set(
    limparTituloParaComparacao(textoB).split(" ").filter(Boolean)
  );

  if (palavrasA.size === 0 || palavrasB.size === 0) return 0;

  let intersecao = 0;

  palavrasA.forEach((palavra) => {
    if (palavrasB.has(palavra)) intersecao += 1;
  });

  const total = new Set([...palavrasA, ...palavrasB]).size;

  return intersecao / total;
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
        fim: 0
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
    comentariosTotais: Number(detalhes.comentariosTotais || 0),
    distribuicaoComentarios: detalhes.distribuicaoComentarios || {
      inicio: 0,
      meio: 0,
      fim: 0
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
  const textoNormalizado = normalizarTexto(texto);
  const textoLimpo = limparTituloParaComparacao(texto);
  const numero = extrairNumero(texto);

  if (!textoNormalizado) return null;

  if (numero) {
    const porOrdem = capitulos.find(
      (capitulo) => Number(capitulo.ordem) === Number(numero)
    );

    if (porOrdem) return porOrdem;

    const porTituloComNumero = capitulos.find((capitulo) => {
      const titulo = normalizarTexto(capitulo.titulo);

      return (
        titulo.includes(`capitulo ${numero}`) ||
        titulo.includes(`cap ${numero}`) ||
        titulo.includes(`parte ${numero}`) ||
        titulo.includes(`episodio ${numero}`) ||
        titulo.startsWith(`${numero} `) ||
        titulo.startsWith(`${numero}-`) ||
        titulo.startsWith(`${numero}.`)
      );
    });

    if (porTituloComNumero) return porTituloComNumero;
  }

  const porTituloExato = capitulos.find(
    (capitulo) => normalizarTexto(capitulo.titulo) === textoNormalizado
  );

  if (porTituloExato) return porTituloExato;

  const porTituloLimpoExato = capitulos.find(
    (capitulo) => limparTituloParaComparacao(capitulo.titulo) === textoLimpo
  );

  if (porTituloLimpoExato) return porTituloLimpoExato;

  const porParcial = capitulos.find((capitulo) => {
    const titulo = normalizarTexto(capitulo.titulo);
    const tituloLimpo = limparTituloParaComparacao(capitulo.titulo);

    return (
      titulo.includes(textoNormalizado) ||
      textoNormalizado.includes(titulo) ||
      tituloLimpo.includes(textoLimpo) ||
      textoLimpo.includes(tituloLimpo)
    );
  });

  if (porParcial) return porParcial;

  const candidatos = capitulos
    .map((capitulo) => ({
      capitulo,
      similaridade: calcularSimilaridade(texto, capitulo.titulo)
    }))
    .filter((item) => item.similaridade >= 0.5)
    .sort((a, b) => b.similaridade - a.similaridade);

  if (candidatos.length > 0) return candidatos[0].capitulo;

  return null;
}