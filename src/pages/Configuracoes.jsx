import { useEffect, useMemo, useState } from "react";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "../firebase/config.js";

import { useDialog } from "../components/DialogProvider.jsx";
import FeedbackModal from "../components/FeedbackModal.jsx";
import {
  buscarRegrasPadrao,
  salvarRegrasPadrao,
  USUARIOS_APROVACAO_AUTOMATICA_PADRAO
} from "../services/regrasService.js";
import { canonicalizarUsuario, normalizarUsuario } from "../utils/normalizarUsuario.js";

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

async function resetarMetricasCapitulosTodasObras() {
  const obrasSnapshot = await getDocs(collection(db, "obras"));
  let totalCapitulos = 0;

  for (const obraDoc of obrasSnapshot.docs) {
    const capitulosSnapshot = await getDocs(
      collection(db, "obras", obraDoc.id, "capitulos")
    );

    for (const capituloDoc of capitulosSnapshot.docs) {
      await setDoc(
        doc(db, "obras", obraDoc.id, "capitulos", capituloDoc.id),
        {
          palavras: 0,
          paragrafos: 0,
          comentariosTotais: 0,
          distribuicaoComentarios: {
            inicio: 0,
            meio: 0,
            fim: 0,
            geral: 0
          },
          paragrafosDetalhados: [],
          atualizadoEm: serverTimestamp()
        },
        { merge: true }
      );

      totalCapitulos += 1;
    }
  }

  return {
    obras: obrasSnapshot.docs.length,
    capitulos: totalCapitulos
  };
}

export default function Configuracoes() {
  const dialog = useDialog();
  const [mensagem, setMensagem] = useState("");
  const [apagando, setApagando] = useState("");
  const [aprovacaoAutomaticaUsuarios, setAprovacaoAutomaticaUsuarios] =
    useState(true);
  const [usuariosAprovacaoAutomatica, setUsuariosAprovacaoAutomatica] = useState(
    USUARIOS_APROVACAO_AUTOMATICA_PADRAO
  );
  const [novoUsuarioTeste, setNovoUsuarioTeste] = useState("");
  const [salvandoConfiguracao, setSalvandoConfiguracao] = useState(false);

  useEffect(() => {
    buscarRegrasPadrao()
      .then((regras) => {
        setAprovacaoAutomaticaUsuarios(regras.aprovacaoAutomaticaUsuarios !== false);
        setUsuariosAprovacaoAutomatica(
          Array.isArray(regras.usuariosAprovacaoAutomatica)
            ? regras.usuariosAprovacaoAutomatica
            : USUARIOS_APROVACAO_AUTOMATICA_PADRAO
        );
      })
      .catch((erro) => console.error(erro));
  }, []);

  async function confirmarCodigoTeste(acao) {
    const codigo = await dialog.prompt({
      title: "Código de segurança",
      message: `Digite o código 1508 para ${acao}.`,
      inputLabel: "Código",
      placeholder: "1508",
      required: true,
      confirmLabel: "Confirmar"
    });

    if (codigo === null) return false;

    if (codigo.trim() !== "1508") {
      setMensagem("Ação cancelada. Código incorreto.");
      return false;
    }

    return true;
  }

  async function alternarAprovacaoAutomatica() {
    const autorizado = await confirmarCodigoTeste(
      aprovacaoAutomaticaUsuarios
        ? "desativar o Teste"
        : "ativar o Teste"
    );
    if (!autorizado) return;

    const novoValor = !aprovacaoAutomaticaUsuarios;
    setSalvandoConfiguracao(true);

    try {
      await salvarRegrasPadrao({ aprovacaoAutomaticaUsuarios: novoValor });
      setAprovacaoAutomaticaUsuarios(novoValor);
      setMensagem(
        novoValor
          ? "Aprovação automática dos usuários especiais ativada."
          : "Aprovação automática dos usuários especiais desativada."
      );
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar essa configuração.");
    } finally {
      setSalvandoConfiguracao(false);
    }
  }

  async function adicionarUsuarioTeste(evento) {
    evento.preventDefault();

    const usuario = canonicalizarUsuario(novoUsuarioTeste);
    if (!usuario) {
      setMensagem("Informe o user que deseja adicionar.");
      return;
    }

    const usuarioNormalizado = normalizarUsuario(usuario);
    if (
      usuariosAprovacaoAutomatica.some(
        (item) => normalizarUsuario(item) === usuarioNormalizado
      )
    ) {
      setMensagem("Esse user já está na lista do Teste.");
      return;
    }

    const autorizado = await confirmarCodigoTeste(`adicionar @${usuario} ao Teste`);
    if (!autorizado) return;

    const novaLista = [...usuariosAprovacaoAutomatica, usuario];
    setSalvandoConfiguracao(true);
    setMensagem("");

    try {
      await salvarRegrasPadrao({ usuariosAprovacaoAutomatica: novaLista });
      setUsuariosAprovacaoAutomatica(novaLista);
      setNovoUsuarioTeste("");
      setMensagem(`@${usuario} adicionado ao Teste.`);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao adicionar o user ao Teste.");
    } finally {
      setSalvandoConfiguracao(false);
    }
  }

  async function removerUsuarioTeste(usuario) {
    const desejaRemover = await dialog.confirm({
      title: "Remover user do Teste",
      message: `Remover @${usuario} da aprovação automática?`,
      confirmLabel: "Remover",
      variant: "danger"
    });
    if (!desejaRemover) return;

    const autorizado = await confirmarCodigoTeste(`remover @${usuario} do Teste`);
    if (!autorizado) return;

    const usuarioNormalizado = normalizarUsuario(usuario);
    const novaLista = usuariosAprovacaoAutomatica.filter(
      (item) => normalizarUsuario(item) !== usuarioNormalizado
    );
    setSalvandoConfiguracao(true);
    setMensagem("");

    try {
      await salvarRegrasPadrao({ usuariosAprovacaoAutomatica: novaLista });
      setUsuariosAprovacaoAutomatica(novaLista);
      setMensagem(`@${usuario} removido do Teste.`);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao remover o user do Teste.");
    } finally {
      setSalvandoConfiguracao(false);
    }
  }

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
    const primeiraConfirmacao = await dialog.confirm({
      title: "Atenção",
      message:
        `Você está prestes a apagar ${tipo}.\n\n` +
        `Essa ação não deve ser feita sem certeza.\n\n` +
        `Deseja continuar?`,
      confirmLabel: "Continuar",
      variant: "danger"
    });

    if (!primeiraConfirmacao) return;

    const segundaConfirmacao = await dialog.prompt({
      title: "Confirmação final",
      message:
        `Digite exatamente:\n${textoConfirmacao}\n\n` +
        `para apagar ${tipo}.`,
      inputLabel: "Texto de confirmação",
      confirmLabel: "Apagar",
      required: true,
      variant: "danger"
    });

    if (segundaConfirmacao === null) return;

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

  async function resetarCapitulos() {
    await confirmarDuasVezes({
      tipo: "as métricas dos capítulos de todas as obras",
      textoConfirmacao: "RESETAR CAPITULOS",
      acao: async () => {
        const resultado = await resetarMetricasCapitulosTodasObras();

        setMensagem(
          `${resultado.capitulos} capítulo(s) de ${resultado.obras} obra(s) resetado(s). Agora você pode usar Atualizar todos novamente.`
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

      <FeedbackModal
        mensagem={mensagem}
        carregando={Boolean(apagando)}
        onClose={() => setMensagem("")}
      />

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
        <h3>Verificação automática</h3>

        <div className="settings-toggle-row">
          <div>
            <strong>Desativar Teste</strong>
            <p>Controla a aprovação automática dos users listados abaixo.</p>
          </div>

          <button
            type="button"
            className={
              aprovacaoAutomaticaUsuarios
                ? "button-secondary"
                : "button-primary"
            }
            onClick={alternarAprovacaoAutomatica}
            disabled={salvandoConfiguracao}
          >
            {salvandoConfiguracao
              ? "Salvando..."
              : aprovacaoAutomaticaUsuarios
                ? "Desativar Teste"
                : "Ativar Teste"}
          </button>
        </div>

        <div className="automatic-test-users">
          <div className="automatic-test-users-heading">
            <div>
              <strong>Users do Teste</strong>
              <p>
                Esses users são aprovados automaticamente quando o Teste está ativo.
              </p>
            </div>
            <span className="automatic-test-users-count">
              {usuariosAprovacaoAutomatica.length} user(s)
            </span>
          </div>

          <div className="automatic-test-user-list">
            {usuariosAprovacaoAutomatica.length === 0 ? (
              <span className="automatic-test-users-empty">
                Nenhum user cadastrado. O Teste não aprovará ninguém automaticamente.
              </span>
            ) : (
              usuariosAprovacaoAutomatica.map((usuario) => (
                <div className="automatic-test-user-item" key={normalizarUsuario(usuario)}>
                  <span>@{usuario}</span>
                  <button
                    type="button"
                    className="button-danger button-small"
                    onClick={() => removerUsuarioTeste(usuario)}
                    disabled={salvandoConfiguracao}
                  >
                    Remover
                  </button>
                </div>
              ))
            )}
          </div>

          <form className="automatic-test-add-form" onSubmit={adicionarUsuarioTeste}>
            <label>
              Adicionar user ao Teste
              <input
                type="text"
                value={novoUsuarioTeste}
                onChange={(evento) => setNovoUsuarioTeste(evento.target.value)}
                placeholder="@novo_user"
              />
            </label>
            <button
              type="submit"
              className="button-secondary"
              disabled={salvandoConfiguracao}
            >
              Adicionar user
            </button>
          </form>
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

          <button
            type="button"
            className="button-danger"
            onClick={resetarCapitulos}
            disabled={Boolean(apagando)}
          >
            {apagando === "as métricas dos capítulos de todas as obras"
              ? "Resetando..."
              : "Resetar capítulos"}
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
