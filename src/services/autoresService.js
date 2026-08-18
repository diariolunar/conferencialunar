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
import { canonicalizarUsuario } from "../utils/normalizarUsuario.js";

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
  const user = canonicalizarUsuario(dados.user);

  const ref = await addDoc(collection(db, AUTORES_COLLECTION), {
    nome: dados.nome || "",
    nomeNormalizado: normalizarTexto(dados.nome || ""),
    user,
    userNormalizado: normalizarTexto(user),
    linkPerfil: dados.linkPerfil || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  return ref.id;
}

export async function atualizarAutor(autorId, dados) {
  const ref = doc(db, AUTORES_COLLECTION, autorId);
  const user = canonicalizarUsuario(dados.user);

  await setDoc(
    ref,
    {
      nome: dados.nome || "",
      nomeNormalizado: normalizarTexto(dados.nome || ""),
      user,
      userNormalizado: normalizarTexto(user),
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
