import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase/config.js";

const HISTORICO_COLLECTION = "historicoConferencias";

export async function salvarConferenciaNoHistorico(conferencia) {
  const ref = await addDoc(collection(db, HISTORICO_COLLECTION), {
    sub: conferencia.sub || "",
    diaSemana: conferencia.diaSemana || "",
    nomeLeitor: conferencia.nomeLeitor || "",
    userLeitor: conferencia.userLeitor || "",
    adm: conferencia.adm || "",
    minhaObra: Boolean(conferencia.minhaObra),
    feedbackOferecido: Boolean(conferencia.feedbackOferecido),
    obraId: conferencia.obraId || "",
    obraTitulo: conferencia.obraTitulo || "",
    capitulos: conferencia.capitulos || [],
    textoFichaOriginal: conferencia.textoFichaOriginal || "",
    resumo: conferencia.resumo || "",
    criadoEm: serverTimestamp()
  });

  return ref.id;
}

export async function listarHistoricoConferencias() {
  const q = query(
    collection(db, HISTORICO_COLLECTION),
    orderBy("criadoEm", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export function agruparHistoricoPorSubDiaMembro(historico = []) {
  const grupos = {};

  historico.forEach((item) => {
    const sub = item.sub || "Sub não informado";
    const dia = item.diaSemana || "Dia não informado";
    const membro =
      item.nomeLeitor || item.userLeitor || "Membro não informado";

    if (!grupos[sub]) {
      grupos[sub] = {};
    }

    if (!grupos[sub][dia]) {
      grupos[sub][dia] = {};
    }

    if (!grupos[sub][dia][membro]) {
      grupos[sub][dia][membro] = [];
    }

    grupos[sub][dia][membro].push(item);
  });

  return grupos;
}

export function calcularResumoHistorico(lista = []) {
  const totalConferencias = lista.length;

  const capitulos = lista.flatMap((item) => item.capitulos || []);

  const totalCapitulos = capitulos.length;

  const aprovados = capitulos.filter(
    (capitulo) => capitulo.resultado?.aprovado
  ).length;

  const reprovados = capitulos.filter(
    (capitulo) => capitulo.resultado && !capitulo.resultado.aprovado
  ).length;

  const aprovadosManualmente = capitulos.filter(
    (capitulo) => capitulo.resultado?.aprovadoManualmente
  ).length;

  const comentarios = capitulos.reduce(
    (total, capitulo) =>
      total + Number(capitulo.resultado?.estatisticas?.comentarios || 0),
    0
  );

  return {
    totalConferencias,
    totalCapitulos,
    aprovados,
    reprovados,
    aprovadosManualmente,
    comentarios
  };
}