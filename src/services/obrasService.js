import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";

import { db } from "../firebase/config.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";

const OBRAS_COLLECTION = "obras";

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

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function buscarObraPorTitulo(titulo = "") {
  const tituloNormalizado = normalizarTexto(titulo);

  if (!tituloNormalizado) return null;

  const q = query(
    collection(db, OBRAS_COLLECTION),
    where("tituloNormalizado", "==", tituloNormalizado)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const documento = snapshot.docs[0];

  return {
    id: documento.id,
    ...documento.data()
  };
}

export async function buscarObraPorWattpadId(wattpadId = "") {
  if (!wattpadId) return null;

  const q = query(
    collection(db, OBRAS_COLLECTION),
    where("wattpadId", "==", String(wattpadId))
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const documento = snapshot.docs[0];

  return {
    id: documento.id,
    ...documento.data()
  };
}

export async function salvarObra(obra) {
  const obraPorWattpadId = obra.wattpadId
    ? await buscarObraPorWattpadId(obra.wattpadId)
    : null;

  const obraPorTitulo = !obraPorWattpadId
    ? await buscarObraPorTitulo(obra.titulo || "")
    : null;

  const obraExistente = obraPorWattpadId || obraPorTitulo;

  const dados = {
    wattpadId: obra.wattpadId || obraExistente?.wattpadId || "",
    titulo: obra.titulo || obraExistente?.titulo || "",
    tituloNormalizado: normalizarTexto(obra.titulo || obraExistente?.titulo || ""),
    autor: obra.autor || obraExistente?.autor || "",
    autorNormalizado: normalizarTexto(obra.autor || obraExistente?.autor || ""),
    userAutor: obra.userAutor || obraExistente?.userAutor || "",
    userAutorNormalizado: normalizarTexto(
      obra.userAutor || obraExistente?.userAutor || ""
    ),
    descricao: obra.descricao || obraExistente?.descricao || "",
    capa: obra.capa || obraExistente?.capa || "",
    link: obra.link || obraExistente?.link || "",
    atualizadoEm: serverTimestamp()
  };

  if (obraExistente?.id) {
    const ref = doc(db, OBRAS_COLLECTION, obraExistente.id);

    await setDoc(ref, dados, { merge: true });

    return obraExistente.id;
  }

  const ref = await addDoc(collection(db, OBRAS_COLLECTION), {
    ...dados,
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

  if (dados.autor !== undefined) {
    dadosLimpos.autorNormalizado = normalizarTexto(dados.autor || "");
  }

  if (dados.userAutor !== undefined) {
    dadosLimpos.userAutorNormalizado = normalizarTexto(dados.userAutor || "");
  }

  Object.keys(dadosLimpos).forEach((chave) => {
    if (dadosLimpos[chave] === undefined) {
      delete dadosLimpos[chave];
    }
  });

  await setDoc(ref, dadosLimpos, { merge: true });
}

export async function excluirObra(obraId) {
  const ref = doc(db, OBRAS_COLLECTION, obraId);
  await deleteDoc(ref);
}

export async function importarObraDoWattpad(link = "") {
  const resposta = await fetch("/api/wattpad/capitulos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ link })
  });

  const textoResposta = await resposta.text();

  if (!textoResposta) {
    throw new Error(
      "A API não respondeu. Teste a importação pelo Vercel ou use a importação por colagem do Console."
    );
  }

  let dados;

  try {
    dados = JSON.parse(textoResposta);
  } catch {
    throw new Error(
      "A API retornou algo que não é JSON. Use a importação por colagem do Console."
    );
  }

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Erro ao importar obra do Wattpad.");
  }

  return dados;
}