import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "../firebase/config.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";

const SUBS_COLLECTION = "subs";

export async function listarSubs() {
  const q = query(collection(db, SUBS_COLLECTION), orderBy("nome", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function salvarSub(dados) {
  const ref = await addDoc(collection(db, SUBS_COLLECTION), {
    nome: dados.nome || "",
    nomeNormalizado: normalizarTexto(dados.nome || ""),
    codigo: dados.codigo || "",
    adm: dados.adm || "",
    imagemPerfil: dados.imagemPerfil || "",
    corPrimaria: dados.corPrimaria || "#6B21A8",
    corSecundaria: dados.corSecundaria || "#3B0764",
    corDestaque: dados.corDestaque || "#F5C842",
    identidadeVisual: dados.identidadeVisual || "",
    descricao: dados.descricao || "",
    regras: dados.regras || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  return ref.id;
}

export async function atualizarSub(subId, dados) {
  const ref = doc(db, SUBS_COLLECTION, subId);

  const dadosLimpos = {
    ...dados,
    atualizadoEm: serverTimestamp()
  };

  if (dados.nome !== undefined) {
    dadosLimpos.nomeNormalizado = normalizarTexto(dados.nome || "");
  }

  Object.keys(dadosLimpos).forEach((chave) => {
    if (dadosLimpos[chave] === undefined) {
      delete dadosLimpos[chave];
    }
  });

  await setDoc(ref, dadosLimpos, { merge: true });
}

export async function salvarOuAtualizarSub(dados) {
  if (dados.id) {
    await atualizarSub(dados.id, dados);
    return dados.id;
  }

  return salvarSub(dados);
}