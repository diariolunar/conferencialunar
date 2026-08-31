import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
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

export async function buscarAutorPorUser(user = "") {
  const userNormalizado = normalizarTexto(canonicalizarUsuario(user));
  if (!userNormalizado) return null;

  const q = query(
    collection(db, AUTORES_COLLECTION),
    where("userNormalizado", "==", userNormalizado)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const documento = snapshot.docs[0];
    return { id: documento.id, ...documento.data() };
  }

  // Compatibilidade com autores antigos que ainda não tinham
  // userNormalizado salvo.
  const todos = await getDocs(collection(db, AUTORES_COLLECTION));
  const documento = todos.docs.find(
    (item) =>
      normalizarTexto(item.data().user || "") === userNormalizado
  );

  if (!documento) return null;
  return { id: documento.id, ...documento.data() };
}

export async function salvarAutor(dados) {
  const user = canonicalizarUsuario(dados.user);

  const ref = await addDoc(collection(db, AUTORES_COLLECTION), {
    nome: dados.nome || user,
    nomeNormalizado: normalizarTexto(dados.nome || user),
    user,
    userNormalizado: normalizarTexto(user),
    linkPerfil: dados.linkPerfil || "",
    avatar: dados.avatar || "",
    descricaoPerfil: dados.descricaoPerfil || "",
    seguidores: Number(dados.seguidores || 0),
    seguindo: Number(dados.seguindo || 0),
    historiasPublicadas: Number(dados.historiasPublicadas || 0),
    verificado: Boolean(dados.verificado),
    privado: Boolean(dados.privado),
    perfilAtualizadoEm: dados.perfilAtualizadoEm || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  return ref.id;
}

export async function atualizarAutor(autorId, dados) {
  const ref = doc(db, AUTORES_COLLECTION, autorId);
  const user = canonicalizarUsuario(dados.user);
  const perfil = {};

  [
    "avatar",
    "descricaoPerfil",
    "seguidores",
    "seguindo",
    "historiasPublicadas",
    "verificado",
    "privado",
    "perfilAtualizadoEm"
  ].forEach((campo) => {
    if (dados[campo] !== undefined) {
      perfil[campo] =
        ["seguidores", "seguindo", "historiasPublicadas"].includes(campo)
          ? Number(dados[campo] || 0)
          : dados[campo];
    }
  });

  await setDoc(
    ref,
    {
      nome: dados.nome || user,
      nomeNormalizado: normalizarTexto(dados.nome || user),
      user,
      userNormalizado: normalizarTexto(user),
      linkPerfil: dados.linkPerfil || "",
      ...perfil,
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

  const existente = await buscarAutorPorUser(dados.user);
  if (existente?.id) {
    await atualizarAutor(existente.id, { ...existente, ...dados });
    return existente.id;
  }

  return salvarAutor(dados);
}

export async function buscarPerfilAutorWattpad(user = "") {
  const resposta = await fetch("/api/wattpad/autor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user })
  });
  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Não foi possível buscar o perfil do autor.");
  }

  return dados.perfil || null;
}

export async function sincronizarAutorWattpad(dados = {}) {
  const user = canonicalizarUsuario(dados.user || dados.userAutor);
  if (!user) return null;

  let perfil = null;
  try {
    perfil = await buscarPerfilAutorWattpad(user);
  } catch (erro) {
    console.warn("Perfil do autor não pôde ser atualizado:", erro.message);
  }

  const existente = await buscarAutorPorUser(user);
  const autor = {
    ...(existente || {}),
    nome: perfil?.nome || dados.nome || dados.autor || existente?.nome || user,
    user: perfil?.user || user,
    linkPerfil:
      perfil?.linkPerfil ||
      existente?.linkPerfil ||
      `https://www.wattpad.com/user/${user}`,
    avatar: perfil?.avatar || existente?.avatar || "",
    descricaoPerfil: perfil?.descricao || existente?.descricaoPerfil || "",
    seguidores: perfil?.seguidores ?? existente?.seguidores ?? 0,
    seguindo: perfil?.seguindo ?? existente?.seguindo ?? 0,
    historiasPublicadas:
      perfil?.historiasPublicadas ?? existente?.historiasPublicadas ?? 0,
    verificado: perfil?.verificado ?? existente?.verificado ?? false,
    privado: perfil?.privado ?? existente?.privado ?? false,
    perfilAtualizadoEm:
      perfil?.atualizadoEm || existente?.perfilAtualizadoEm || ""
  };
  const id = await salvarOuAtualizarAutor(autor);

  return { id, ...autor };
}

export async function excluirAutor(autorId) {
  const ref = doc(db, AUTORES_COLLECTION, autorId);
  await deleteDoc(ref);
}
