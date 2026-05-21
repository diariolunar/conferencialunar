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

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function buscarObraPorTitulo(titulo = "") {
  const tituloNormalizado = normalizarTexto(titulo);

  if (!tituloNormalizado) {
    return null;
  }

  const q = query(
    collection(db, OBRAS_COLLECTION),
    where("tituloNormalizado", "==", tituloNormalizado)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const documento = snapshot.docs[0];

  return {
    id: documento.id,
    ...documento.data()
  };
}

export async function buscarObraPorWattpadId(wattpadId = "") {
  if (!wattpadId) {
    return null;
  }

  const q = query(
    collection(db, OBRAS_COLLECTION),
    where("wattpadId", "==", String(wattpadId))
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const documento = snapshot.docs[0];

  return {
    id: documento.id,
    ...documento.data()
  };
}

export async function salvarObra(obra) {
  const ref = await addDoc(collection(db, OBRAS_COLLECTION), {
    wattpadId: obra.wattpadId || "",
    titulo: obra.titulo || "",
    tituloNormalizado: normalizarTexto(obra.titulo || ""),
    descricao: obra.descricao || "",
    capa: obra.capa || "",
    link: obra.link || "",
    atualizadoEm: serverTimestamp(),
    criadoEm: serverTimestamp()
  });

  return ref.id;
}

export async function atualizarObra(obraId, dados) {
  const ref = doc(db, OBRAS_COLLECTION, obraId);

  await setDoc(
    ref,
    {
      ...dados,
      tituloNormalizado: normalizarTexto(dados.titulo || ""),
      atualizadoEm: serverTimestamp()
    },
    { merge: true }
  );
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
      "A API não respondeu. No teste local com npm run dev, as rotas serverless da pasta api podem não funcionar. Teste a importação depois pelo Vercel ou usando vercel dev."
    );
  }

  let dados;

  try {
    dados = JSON.parse(textoResposta);
  } catch {
    throw new Error(
      "A API retornou algo que não é JSON. Isso geralmente acontece quando a rota /api não está rodando no ambiente local."
    );
  }

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Erro ao importar obra do Wattpad.");
  }

  return dados;
}