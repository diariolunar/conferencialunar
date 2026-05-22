import { useMemo, useState } from "react";

import {
  collection,
  deleteDoc,
  doc,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase/config.js";

async function apagarColecaoSimples(nomeColecao) {
  const snapshot = await getDocs(collection(db, nomeColecao));

  for (const documento of snapshot.docs) {
    await deleteDoc(doc(db, nomeColecao, documento.id));
  }

  return snapshot.docs.length;
}

async function apagarObrasComCapitulos() {
  const obrasSnapshot = await getDocs(collection(db, "obras"));

  let totalCapitulos = 0;

  for (const obraDoc of obrasSnapshot.docs) {
    const capitulosSnapshot = await getDocs(
      collection(db, "obras", obraDoc.id, "capitulos")
    );

    for (const capituloDoc of capitulosSnapshot.docs) {
      await deleteDoc(
        doc(db, "obras", obraDoc.id, "capitulos", capituloDoc.id)
      );

      totalCapitulos += 1;
    }

    await deleteDoc(doc(db, "obras", obraDoc.id));
  }

  return {
    obras: obrasSnapshot.docs.length,
    capitulos: totalCapitulos
  };
}

export default function Configuracoes() {
  const [mensagem, setMensagem] = useState("");
  const [apagando, setApagando] = useState("");

  const statusSistema = useMemo(() => {
    return {
      frontend: "React + Vite",
      banco: "Firebase Firestore",
      api: "Serverless Vercel",
      comentarios: "API real do Wattpad",
      importacaoWattpad: "Bookmarklet + Link automático",
      deploy: "GitHub conectado ao Vercel"
    };
  }, []);

  async function confirmarDuasVezes({
    tipo,
    textoConfirmacao,
    acao
  }) {
    const primeiraConfirmacao = window.confirm(
      `ATENÇÃO!\n\nVocê está prestes a apagar ${tipo}.\n\nEssa ação não deve ser feita sem certeza.\n\nDeseja continuar?`
    );

    if (!primeiraConfirmacao) return;

    const segundaConfirmacao = window.prompt(
      `Confirmação final.\n\nDigite exatamente:\n${textoConfirmacao}\n\npara apagar ${tipo}.`
    );

    if (segundaConfirmacao !== textoConfirmacao) {
      setMensagem("Ação cancelada. Texto de confirmação incorreto.");
      return;
    }

    setApagando(tipo);
    setMensagem("");

    try {
      await acao();
    } catch (erro) {
      console.error(erro);
      setMensagem(`Erro ao apagar ${tipo}.`);
    } finally {
      setApagando("");
    }
  }

  async function limparHistorico() {
    await confirmarDuasVezes({
      tipo: "o histórico",
      textoConfirmacao: "APAGAR HISTORICO",
      acao: async () => {
        const total = await apagarColecaoSimples("historicoConferencias");
        setMensagem(`${total} registro(s) do histórico apagado(s).`);
      }
    });
  }

  async function limparSubs() {
    await confirmarDuasVezes({
      tipo: "os subs",
      textoConfirmacao: "APAGAR SUBS",
      acao: async () => {
        const total = await apagarColecaoSimples("subs");
        setMensagem(`${total} sub(s) apagado(s).`);
      }
    });
  }

  async function limparObras() {
    await confirmarDuasVezes({
      tipo: "as obras e capítulos",
      textoConfirmacao: "APAGAR OBRAS",
      acao: async () => {
        const resultado = await apagarObrasComCapitulos();

        setMensagem(
          `${resultado.obras} obra(s) e ${resultado.capitulos} capítulo(s) apagado(s).`
        );
      }
    });
  }

  return (
    <section className="page">
      <div className="page-title">
        <h2>Configurações</h2>
        <p>Status geral, instruções técnicas e manutenção do sistema.</p>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <div className="card">
        <h3>Status do sistema</h3>

        <div className="conference-summary-grid">
          <div>
            <span>Frontend</span>
            <strong>{statusSistema.frontend}</strong>
          </div>

          <div>
            <span>Banco de dados</span>
            <strong>{statusSistema.banco}</strong>
          </div>

          <div>
            <span>API</span>
            <strong>{statusSistema.api}</strong>
          </div>

          <div>
            <span>Comentários</span>
            <strong>{statusSistema.comentarios}</strong>
          </div>

          <div>
            <span>Importação Wattpad</span>
            <strong>{statusSistema.importacaoWattpad}</strong>
          </div>

          <div>
            <span>Deploy</span>
            <strong>{statusSistema.deploy}</strong>
          </div>
        </div>
      </div>

      <div className="card warning-card">
        <h3>Zona de manutenção</h3>

        <div className="warning-list">
          <p>
            Use estas opções apenas quando tiver certeza. Cada limpeza pede duas
            confirmações antes de apagar.
          </p>
        </div>

        <div className="actions-row">
          <button
            type="button"
            className="button-danger"
            onClick={limparHistorico}
            disabled={Boolean(apagando)}
          >
            {apagando === "o histórico"
              ? "Apagando..."
              : "Limpar histórico"}
          </button>

          <button
            type="button"
            className="button-danger"
            onClick={limparSubs}
            disabled={Boolean(apagando)}
          >
            {apagando === "os subs" ? "Apagando..." : "Limpar subs"}
          </button>

          <button
            type="button"
            className="button-danger"
            onClick={limparObras}
            disabled={Boolean(apagando)}
          >
            {apagando === "as obras e capítulos"
              ? "Apagando..."
              : "Limpar obras"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Observação importante</h3>

        <div className="warning-list">
          <p>
            O Wattpad pode limitar ou falhar em algumas buscas. Quando isso
            acontecer, o sistema deve registrar a falha sem derrubar a
            conferência inteira.
          </p>

          <p>
            A importação de obras continua preservando o fluxo atual:
            Bookmarklet e Link automático.
          </p>
        </div>
      </div>
    </section>
  );
}