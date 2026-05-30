import {
  addDoc,
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

const AUTORES_COLLECTION = "autores";

export async function listarAutores() {
  const q = query(collection(db, AUTORES_COLLECTION), orderBy("nome", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function salvarAutor(dados) {
  const ref = await addDoc(collection(db, AUTORES_COLLECTION), {
    nome: dados.nome || "",
    nomeNormalizado: normalizarTexto(dados.nome || ""),
    user: String(dados.user || "").replace(/^@/, "").trim(),
    userNormalizado: normalizarTexto(String(dados.user || "").replace(/^@/, "")),
    linkPerfil: dados.linkPerfil || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  return ref.id;
}

export async function atualizarAutor(autorId, dados) {
  const ref = doc(db, AUTORES_COLLECTION, autorId);

  await setDoc(
    ref,
    {
      nome: dados.nome || "",
      nomeNormalizado: normalizarTexto(dados.nome || ""),
      user: String(dados.user || "").replace(/^@/, "").trim(),
      userNormalizado: normalizarTexto(String(dados.user || "").replace(/^@/, "")),
      linkPerfil: dados.linkPerfil || "",
      atualizadoEm: serverTimestamp()
    },
    { merge: true }
  );
}

export async function salvarOuAtualizarAutor(dados) {
  if (dados.id) {
    await atualizarAutor(dados.id, dados);
    return dados.id;
  }

  return salvarAutor(dados);
}

export async function excluirAutor(autorId) {
  const ref = doc(db, AUTORES_COLLECTION, autorId);
  await deleteDoc(ref);
}