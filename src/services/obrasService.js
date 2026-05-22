import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "../firebase/config.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";

const OBRAS_COLLECTION = "obras";

function simplificarTexto(texto = "") {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizar(texto = "") {
  return simplificarTexto(texto)
    .split(" ")
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
  const distancia = distanciaLevenshtein(textoA, textoB);

  return Math.max(0, 1 - distancia / maior);
}

function similaridadeTokens(a = "", b = "") {
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

function pontuarObra(obra, tituloBusca = "") {
  const tituloObra = obra.titulo || "";
  const titulo = simplificarTexto(tituloObra);
  const busca = simplificarTexto(tituloBusca);

  if (!titulo || !busca) return 0;
  if (titulo === busca) return 100;

  let pontos = 0;

  if (titulo.includes(busca) || busca.includes(titulo)) {
    pontos += 70;
  }

  pontos += Math.max(
    similaridadeAproximada(tituloObra, tituloBusca),
    similaridadeTokens(tituloObra, tituloBusca)
  ) * 80;

  return pontos;
}

export async function listarObras() {
  const q = query(collection(db, OBRAS_COLLECTION), orderBy("titulo", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function buscarObraPorId(obraId) {
  const ref = doc(db, OBRAS_COLLECTION, obraId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function encontrarObraParecida(titulo = "") {
  const obras = await listarObras();

  const candidatos = obras
    .map((obra) => ({
      obra,
      pontos: pontuarObra(obra, titulo)
    }))
    .sort((a, b) => b.pontos - a.pontos);

  const melhor = candidatos[0];

  if (!melhor || melhor.pontos < 45) {
    return null;
  }

  return {
    ...melhor.obra,
    pontosSimilaridade: melhor.pontos
  };
}

export async function salvarObra(dados) {
  const ref = await addDoc(collection(db, OBRAS_COLLECTION), {
    titulo: dados.titulo || "",
    tituloNormalizado: normalizarTexto(dados.titulo || ""),
    autor: dados.autor || "",
    userAutor: dados.userAutor || "",
    link: dados.link || "",
    capa: dados.capa || "",
    descricao: dados.descricao || "",
    atualizadoEm: serverTimestamp(),
    criadoEm: serverTimestamp()
  });

  return ref.id;
}

export async function atualizarObra(obraId, dados) {
  const ref = doc(db, OBRAS_COLLECTION, obraId);

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

export async function salvarOuMesclarObra(dados) {
  const parecida = await encontrarObraParecida(dados.titulo || "");

  if (!parecida) {
    const id = await salvarObra(dados);

    return {
      id,
      mesclada: false,
      obraExistente: null
    };
  }

  await atualizarObra(parecida.id, {
    titulo: dados.titulo || parecida.titulo || "",
    autor: dados.autor || parecida.autor || "",
    userAutor: dados.userAutor || parecida.userAutor || "",
    link: dados.link || parecida.link || "",
    capa: dados.capa || parecida.capa || "",
    descricao: dados.descricao || parecida.descricao || ""
  });

  return {
    id: parecida.id,
    mesclada: true,
    obraExistente: parecida
  };
}