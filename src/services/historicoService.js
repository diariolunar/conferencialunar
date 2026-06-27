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

const HISTORICO_COLLECTION = "historicoConferencias";

function gerarChaveCapitulo(capitulo = {}) {
  return [
    normalizarTexto(capitulo.obraId || capitulo.obraTitulo || ""),
    normalizarTexto(capitulo.capituloId || capitulo.wattpadId || capitulo.titulo || "")
  ].join("__");
}

function normalizarDia(dia = "") {
  return normalizarTexto(dia)
    .replace(/[-_]+/g, " ")
    .replace(/\bfeira\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarUser(user = "") {
  return normalizarTexto(user).replace(/^@/, "");
}

function gerarChaveMembro(item = {}) {
  const user = normalizarUser(item.userLeitor || "");

  if (user) {
    return `@${user}`;
  }

  return normalizarTexto(item.nomeLeitor || "membro-nao-informado");
}

function formatarMembro(item = {}) {
  const nome = item.nomeLeitor || "Membro não informado";
  const user = normalizarUser(item.userLeitor || "");

  if (user) {
    return `${nome} • @${user}`;
  }

  return nome;
}

export async function salvarConferenciaNoHistorico(conferencia) {
  const userNormalizado = normalizarUser(conferencia.userLeitor || "");

  const ref = await addDoc(collection(db, HISTORICO_COLLECTION), {
    sub: conferencia.sub || "",
    diaSemana: conferencia.diaSemana || "",
    diaSemanaNormalizado: normalizarDia(conferencia.diaSemana || ""),
    nomeLeitor: conferencia.nomeLeitor || "",
    userLeitor: conferencia.userLeitor || "",
    userLeitorNormalizado: userNormalizado,
    chaveMembro: gerarChaveMembro(conferencia),
    membroExibicao: formatarMembro(conferencia),
    adm: conferencia.adm || "",
    minhaObra: Boolean(conferencia.minhaObra),
    feedbackOferecido: Boolean(conferencia.feedbackOferecido),
    obraId: conferencia.obraId || "",
    obraTitulo: conferencia.obraTitulo || "",
    capitulos: conferencia.capitulos || [],
    textoFichaOriginal: conferencia.textoFichaOriginal || "",
    resumo: conferencia.resumo || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  return ref.id;
}

export async function atualizarConferenciaNoHistorico(conferenciaId, dados) {
  const ref = doc(db, HISTORICO_COLLECTION, conferenciaId);
  const userNormalizado = normalizarUser(dados.userLeitor || "");
  const diaNormalizado = normalizarDia(dados.diaSemana || "");

  await setDoc(
    ref,
    {
      ...dados,
      userLeitorNormalizado: userNormalizado,
      diaSemanaNormalizado: diaNormalizado,
      chaveMembro: gerarChaveMembro(dados),
      membroExibicao: formatarMembro(dados),
      atualizadoEm: serverTimestamp()
    },
    { merge: true }
  );
}

export async function excluirConferenciaDoHistorico(conferenciaId) {
  const ref = doc(db, HISTORICO_COLLECTION, conferenciaId);
  await deleteDoc(ref);
}

export async function buscarConferenciaPorId(conferenciaId) {
  const ref = doc(db, HISTORICO_COLLECTION, conferenciaId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
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

export async function listarHistorico() {
  return listarHistoricoConferencias();
}

export async function verificarDuplicidadeConferencia(conferencia) {
  const user = normalizarUser(conferencia.userLeitor);
  const dia = normalizarDia(conferencia.diaSemana);

  if (!user || !dia) {
    return [];
  }

  const q = query(
    collection(db, HISTORICO_COLLECTION),
    where("userLeitorNormalizado", "==", user)
  );

  const snapshot = await getDocs(q);

  const capitulosNovos = conferencia.capitulos || [];
  const chavesNovas = new Set(capitulosNovos.map(gerarChaveCapitulo));

  const duplicidades = [];

  snapshot.docs.forEach((documento) => {
    const item = {
      id: documento.id,
      ...documento.data()
    };

    if (normalizarDia(item.diaSemana || "") !== dia) {
      return;
    }

    const capitulosAntigos = item.capitulos || [];

    capitulosAntigos.forEach((capituloAntigo) => {
      const chaveAntiga = gerarChaveCapitulo(capituloAntigo);

      if (chavesNovas.has(chaveAntiga)) {
        duplicidades.push({
          historicoId: item.id,
          diaSemana: item.diaSemana,
          userLeitor: item.userLeitor,
          nomeLeitor: item.nomeLeitor,
          obraTitulo: capituloAntigo.obraTitulo || item.obraTitulo || "",
          capituloTitulo: capituloAntigo.titulo || "",
          criadoEm: item.criadoEm || null
        });
      }
    });
  });

  return duplicidades;
}

export function agruparHistoricoPorSubDiaMembro(historico = []) {
  const grupos = {};

  historico.forEach((item) => {
    const sub = item.sub || "Sub não informado";
    const dia = item.diaSemana || "Dia não informado";
    const membroChave = item.chaveMembro || gerarChaveMembro(item);
    const membroLabel = item.membroExibicao || formatarMembro(item);
    const membro = `${membroLabel}|||${membroChave}`;

    if (!grupos[sub]) grupos[sub] = {};
    if (!grupos[sub][dia]) grupos[sub][dia] = {};
    if (!grupos[sub][dia][membro]) grupos[sub][dia][membro] = [];

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

export function calcularDashboardHistorico(lista = []) {
  const capitulos = lista.flatMap((conferencia) =>
    (conferencia.capitulos || []).map((capitulo) => ({
      ...capitulo,
      sub: conferencia.sub,
      diaSemana: conferencia.diaSemana,
      nomeLeitor: conferencia.nomeLeitor,
      userLeitor: conferencia.userLeitor,
      chaveMembro: conferencia.chaveMembro || gerarChaveMembro(conferencia),
      membroExibicao: conferencia.membroExibicao || formatarMembro(conferencia),
      adm: conferencia.adm
    }))
  );

  const porDia = {};
  const porSub = {};
  const porMembro = {};
  const porObra = {};

  capitulos.forEach((capitulo) => {
    const dia = capitulo.diaSemana || "Dia não informado";
    const sub = capitulo.sub || "Sub não informado";
    const membroChave = capitulo.chaveMembro || gerarChaveMembro(capitulo);
    const membroNome = capitulo.membroExibicao || formatarMembro(capitulo);
    const obra = capitulo.obraTitulo || "Obra não informada";

    if (!porDia[dia]) {
      porDia[dia] = {
        total: 0,
        aprovados: 0,
        reprovados: 0,
        comentarios: 0
      };
    }

    if (!porSub[sub]) {
      porSub[sub] = {
        total: 0,
        aprovados: 0,
        reprovados: 0,
        comentarios: 0
      };
    }

    if (!porMembro[membroChave]) {
      porMembro[membroChave] = {
        nome: membroNome,
        total: 0,
        aprovados: 0,
        reprovados: 0,
        comentarios: 0
      };
    }

    if (!porObra[obra]) {
      porObra[obra] = {
        total: 0,
        aprovados: 0,
        reprovados: 0,
        comentarios: 0
      };
    }

    const aprovado = Boolean(capitulo.resultado?.aprovado);
    const comentarios = Number(capitulo.resultado?.estatisticas?.comentarios || 0);

    [porDia[dia], porSub[sub], porMembro[membroChave], porObra[obra]].forEach(
      (grupo) => {
        grupo.total += 1;
        grupo.comentarios += comentarios;

        if (aprovado) {
          grupo.aprovados += 1;
        } else {
          grupo.reprovados += 1;
        }
      }
    );
  });

  const rankingMembros = Object.values(porMembro).sort(
    (a, b) => b.aprovados - a.aprovados || b.comentarios - a.comentarios
  );

  const rankingObras = Object.entries(porObra)
    .map(([nome, dados]) => ({
      nome,
      ...dados
    }))
    .sort((a, b) => b.total - a.total || b.comentarios - a.comentarios);

  return {
    totalConferencias: lista.length,
    totalCapitulos: capitulos.length,
    aprovados: capitulos.filter((capitulo) => capitulo.resultado?.aprovado).length,
    reprovados: capitulos.filter(
      (capitulo) => capitulo.resultado && !capitulo.resultado.aprovado
    ).length,
    comentarios: capitulos.reduce(
      (total, capitulo) =>
        total + Number(capitulo.resultado?.estatisticas?.comentarios || 0),
      0
    ),
    porDia,
    porSub,
    rankingMembros,
    rankingObras
  };
}
