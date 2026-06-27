import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  excluirObra,
  importarObraDoWattpad,
  listarObras,
  salvarObra
} from "../services/obrasService.js";

import { salvarCapitulosDaObra } from "../services/capitulosService.js";
import { useDialog } from "../components/DialogProvider.jsx";
import FeedbackModal from "../components/FeedbackModal.jsx";
import { interpretarImportacaoWattpad } from "../utils/interpretarImportacaoWattpad.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";

export default function Obras() {
  const dialog = useDialog();
  const [obras, setObras] = useState([]);
  const [busca, setBusca] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [abaImportacao, setAbaImportacao] = useState("console");
  const [linkImportacao, setLinkImportacao] = useState("");
  const [textoImportacaoManual, setTextoImportacaoManual] = useState("");
  const [previewImportacao, setPreviewImportacao] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [importando, setImportando] = useState(false);

  const obrasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return [...obras]
      .filter((obra) => {
        if (!termo) return true;

        const alvo = normalizarTexto(
          [
            obra.titulo,
            obra.autor,
            obra.userAutor,
            obra.wattpadId
          ]
            .filter(Boolean)
            .join(" ")
        );

        return alvo.includes(termo);
      })
      .sort((a, b) =>
        String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR", {
          sensitivity: "base"
        })
      );
  }, [obras, busca]);

  async function carregarObras() {
    try {
      const lista = await listarObras();
      setObras(lista);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar obras.");
    }
  }

  useEffect(() => {
    carregarObras();
  }, []);

  function abrirModal() {
    setModalAberto(true);
    setMensagem("");
    setPreviewImportacao(null);
    setAbaImportacao("console");
  }

  function fecharModal() {
    setModalAberto(false);
    setLinkImportacao("");
    setTextoImportacaoManual("");
    setPreviewImportacao(null);
    setAbaImportacao("console");
  }

  async function prepararImportacao(evento) {
    evento.preventDefault();

    if (!linkImportacao.trim()) {
      setMensagem("Cole o link da obra.");
      return;
    }

    setImportando(true);
    setMensagem("");
    setPreviewImportacao(null);

    try {
      const dados = await importarObraDoWattpad(linkImportacao);
      setPreviewImportacao(dados);

      if (dados.aviso) {
        setMensagem(dados.aviso);
      }
    } catch (erro) {
      console.error(erro);
      setMensagem(erro.message || "Erro ao importar obra.");
    } finally {
      setImportando(false);
    }
  }

  function prepararImportacaoManual(evento) {
    evento.preventDefault();

    if (!textoImportacaoManual.trim()) {
      setMensagem("Cole os metadados copiados do Wattpad.");
      return;
    }

    const dados = interpretarImportacaoWattpad(textoImportacaoManual);

    if (!dados.obra.titulo) {
      setMensagem("Título da obra não encontrado.");
      return;
    }

    setPreviewImportacao({
      sucesso: true,
      fonte: "bookmarklet",
      obra: dados.obra,
      capitulos: dados.capitulos,
      totalCapitulos: dados.totalCapitulos
    });

    setMensagem("");
  }

  async function salvarImportacao() {
    if (!previewImportacao?.obra) {
      return;
    }

    try {
      setImportando(true);

      const obraId = await salvarObra(previewImportacao.obra);

      if (previewImportacao.capitulos?.length) {
        await salvarCapitulosDaObra(obraId, previewImportacao.capitulos);
      }

      await carregarObras();
      fecharModal();

      setMensagem("Obra salva com sucesso.");
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar obra.");
    } finally {
      setImportando(false);
    }
  }

  async function handleExcluir(obraId) {
    const confirmar = await dialog.confirm({
      title: "Excluir obra",
      message:
        "Deseja realmente excluir esta obra? Os capítulos cadastrados nela também serão excluídos.",
      confirmLabel: "Excluir",
      variant: "danger"
    });

    if (!confirmar) return;

    try {
      await excluirObra(obraId);
      await carregarObras();
      setMensagem("Obra excluída.");
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao excluir obra.");
    }
  }

  return (
    <section className="page">
      <div className="page-title page-title-row">
        <div>
          <h2>Obras</h2>
          <p>Gerencie as obras utilizadas nas conferências.</p>
        </div>

        <button type="button" className="button-primary" onClick={abrirModal}>
          Nova Obra
        </button>
      </div>

      <FeedbackModal
        mensagem={mensagem}
        carregando={importando}
        onClose={() => setMensagem("")}
      />

      <div className="card">
        <div className="page-title-row">
          <div>
            <h3>Obras cadastradas</h3>
            <p>
              {obrasFiltradas.length} obra(s) exibida(s) de {obras.length}.
            </p>
          </div>

          <label className="search-field">
            Buscar obra
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por título, autor, user ou ID"
            />
          </label>
        </div>

        {obrasFiltradas.length === 0 ? (
          <div className="empty-state">Nenhuma obra encontrada.</div>
        ) : (
          <div className="works-list">
            {obrasFiltradas.map((obra) => (
              <div className="work-list-card" key={obra.id}>
                <div className="work-list-cover">
                  {obra.capa ? (
                    <img src={obra.capa} alt={obra.titulo} />
                  ) : (
                    <div className="obra-cover-placeholder">Sem capa</div>
                  )}
                </div>

                <div className="work-list-info">
                  <h3>{obra.titulo}</h3>

                  <p>
                    {obra.autor || "Autor não informado"}
                    {obra.userAutor ? ` • @${obra.userAutor}` : ""}
                  </p>

                  <span>Wattpad ID: {obra.wattpadId || "-"}</span>
                </div>

                <div className="work-list-actions">
                  <Link className="button-secondary" to={`/obras/${obra.id}`}>
                    Detalhes
                  </Link>

                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => handleExcluir(obra.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="modal-backdrop">
          <div className="modal-card modal-large">
            <div className="modal-header">
              <div>
                <h3>Nova Obra</h3>
                <p>Importe uma obra do Wattpad.</p>
              </div>

              <button type="button" className="modal-close" onClick={fecharModal}>
                ×
              </button>
            </div>

            <div className="modal-tabs">
              <button
                type="button"
                className={abaImportacao === "console" ? "active" : ""}
                onClick={() => setAbaImportacao("console")}
              >
                Bookmarklet
              </button>

              <button
                type="button"
                className={abaImportacao === "link" ? "active" : ""}
                onClick={() => setAbaImportacao("link")}
              >
                Link automático
              </button>
            </div>

            {abaImportacao === "console" && (
              <form className="form-grid" onSubmit={prepararImportacaoManual}>
                <label>
                  Cole os dados copiados do Wattpad
                  <textarea
                    rows="12"
                    value={textoImportacaoManual}
                    onChange={(evento) =>
                      setTextoImportacaoManual(evento.target.value)
                    }
                    placeholder={`TÍTULO: Nome da obra
CAPA: https://...
LINK: https://www.wattpad.com/story/...
CAPÍTULOS:
1. Prólogo | https://www.wattpad.com/123456
2. Capítulo 1 | https://www.wattpad.com/789101`}
                  />
                </label>

                <button type="submit" className="button-secondary">
                  Preparar importação
                </button>
              </form>
            )}

            {abaImportacao === "link" && (
              <form className="form-grid" onSubmit={prepararImportacao}>
                <label>
                  Link da obra
                  <input
                    type="text"
                    value={linkImportacao}
                    onChange={(evento) => setLinkImportacao(evento.target.value)}
                    placeholder="https://www.wattpad.com/story/123456"
                  />
                </label>

                <button
                  type="submit"
                  className="button-secondary"
                  disabled={importando}
                >
                  {importando ? "Importando..." : "Preparar importação"}
                </button>
              </form>
            )}

            {previewImportacao && (
              <div className="modal-preview">
                <div className="obra-header-card">
                  {previewImportacao.obra.capa ? (
                    <img
                      src={previewImportacao.obra.capa}
                      alt={previewImportacao.obra.titulo}
                    />
                  ) : (
                    <div className="obra-cover-placeholder">Sem capa</div>
                  )}

                  <div>
                    <h3>{previewImportacao.obra.titulo}</h3>

                    <p>
                      {previewImportacao.obra.autor || "Autor não informado"}
                      {previewImportacao.obra.userAutor
                        ? ` • @${previewImportacao.obra.userAutor}`
                        : ""}
                    </p>

                    <p>
                      Capítulos encontrados:{" "}
                      <strong>{previewImportacao.totalCapitulos}</strong>
                    </p>
                  </div>
                </div>

                <div className="table-wrapper preview-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Título</th>
                      </tr>
                    </thead>

                    <tbody>
                      {previewImportacao.capitulos.map((capitulo) => (
                        <tr key={`${capitulo.ordem}-${capitulo.titulo}`}>
                          <td>{capitulo.ordem}</td>
                          <td>{capitulo.titulo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="actions-row">
                  <button
                    type="button"
                    className="button-primary"
                    onClick={salvarImportacao}
                    disabled={importando}
                  >
                    {importando ? "Salvando..." : "Salvar obra"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
