import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebase/config.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";

const SUBS_COLLECTION = "subs";

export async function criarSub(nome) {
  const ref = await addDoc(collection(db, SUBS_COLLECTION), {
    nome,
    nomeNormalizado: normalizarTexto(nome),
    ativo: true,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  return ref.id;
}

export async function listarSubs() {
  const q = query(collection(db, SUBS_COLLECTION), orderBy("nome", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function atualizarSub(subId, dados) {
  const ref = doc(db, SUBS_COLLECTION, subId);

  await updateDoc(ref, {
    ...dados,
    nomeNormalizado: dados.nome ? normalizarTexto(dados.nome) : dados.nomeNormalizado,
    atualizadoEm: serverTimestamp()
  });
}

export async function excluirSub(subId) {
  const ref = doc(db, SUBS_COLLECTION, subId);
  await deleteDoc(ref);
}