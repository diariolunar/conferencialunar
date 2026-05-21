import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch
} from "firebase/firestore";

import { db } from "../firebase/config.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";
import { obterChaveSemana, obterLabelSemana } from "../utils/obterSemana.js";

const HISTORICO_COLLECTION = "historicoConferencias";

export async function listarHistorico() {
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

export async function verificarDuplicidade(conferencia) {
  const subNormalizado = normalizarTexto(conferencia.sub);
  const leitorNormalizado = normalizarTexto(conferencia.nomeLeitor);
  const userLeitorNormalizado = normalizarTexto(conferencia.userLeitor);
  const diaSemana = conferencia.diaSemana;
  const chaveSemana = conferencia.chaveSemana || obterChaveSemana();

  const q = query(
    collection(db, HISTORICO_COLLECTION),
    where("subNormalizado", "==", subNormalizado),
    where("diaSemana", "==", diaSemana),
    where("chaveSemana", "==", chaveSemana)
  );

  const snapshot = await getDocs(q);
  const capitulosNovos = conferencia.capitulos || [];

  for (const documento of snapshot.docs) {
    const registro = documento.data();

    const mesmoLeitorPorNome =
      leitorNormalizado &&
      registro.leitorNormalizado === leitorNormalizado;

    const mesmoLeitorPorUser =
      userLeitorNormalizado &&
      registro.userLeitorNormalizado === userLeitorNormalizado;

    if (!mesmoLeitorPorNome && !mesmoLeitorPorUser) {
      continue;
    }

    const capitulosAntigos = registro.capitulos || [];

    for (const novo of capitulosNovos) {
      const novoObraId = novo.obraId || conferencia.obraId || "";
      const novoObraTitulo = novo.obraTitulo || conferencia.obraTitulo || "";

      const existe = capitulosAntigos.some((antigo) => {
        const mesmaObra =
          (antigo.obraId && novoObraId && antigo.obraId === novoObraId) ||
          normalizarTexto(antigo.obraTitulo) === normalizarTexto(novoObraTitulo);

        const mesmoCapitulo =
          (antigo.capituloId &&
            novo.capituloId &&
            antigo.capituloId === novo.capituloId) ||
          normalizarTexto(antigo.titulo) === normalizarTexto(novo.titulo);

        return mesmaObra && mesmoCapitulo;
      });

      if (existe) {
        return {
          existe: true,
          mensagem:
            "Duplicidade bloqueada: este membro já teve este capítulo conferido neste sub, neste dia e nesta semana."
        };
      }
    }
  }

  return {
    existe: false,
    mensagem: ""
  };
}

export async function salvarConferenciaNoHistorico(conferencia) {
  const chaveSemana = conferencia.chaveSemana || obterChaveSemana();
  const labelSemana = conferencia.labelSemana || obterLabelSemana();

  const conferenciaCompleta = {
    ...conferencia,
    chaveSemana,
    labelSemana
  };

  const duplicidade = await verificarDuplicidade(conferenciaCompleta);

  if (duplicidade.existe) {
    throw new Error(duplicidade.mensagem);
  }

  const aprovado = conferenciaCompleta.capitulos.every(
    (capitulo) => capitulo.resultado?.aprovado
  );

  const totalComentarios = conferenciaCompleta.capitulos.reduce(
    (total, capitulo) =>
      total + Number(capitulo.resultado?.estatisticas?.comentarios || 0),
    0
  );

  const ref = await addDoc(collection(db, HISTORICO_COLLECTION), {
    ...conferenciaCompleta,

    aprovado,
    totalCapitulos: conferenciaCompleta.capitulos.length,
    totalComentarios,

    subNormalizado: normalizarTexto(conferenciaCompleta.sub),
    leitorNormalizado: normalizarTexto(conferenciaCompleta.nomeLeitor),
    userLeitorNormalizado: normalizarTexto(conferenciaCompleta.userLeitor),
    obraTituloNormalizado: normalizarTexto(conferenciaCompleta.obraTitulo),

    criadoEm: serverTimestamp()
  });

  return ref.id;
}

export async function excluirConferencia(conferenciaId) {
  const ref = doc(db, HISTORICO_COLLECTION, conferenciaId);
  await deleteDoc(ref);
}

export async function limparHistoricoGeral() {
  const snapshot = await getDocs(collection(db, HISTORICO_COLLECTION));
  const batch = writeBatch(db);

  snapshot.docs.forEach((documento) => {
    batch.delete(documento.ref);
  });

  await batch.commit();
}

export async function limparHistoricoPorSub(sub) {
  const subNormalizado = normalizarTexto(sub);

  const q = query(
    collection(db, HISTORICO_COLLECTION),
    where("subNormalizado", "==", subNormalizado)
  );

  const snapshot = await getDocs(q);
  const batch = writeBatch(db);

  snapshot.docs.forEach((documento) => {
    batch.delete(documento.ref);
  });

  await batch.commit();
}