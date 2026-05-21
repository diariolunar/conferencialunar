import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  excluirObra,
  importarObraDoWattpad,
  listarObras,
  salvarObra
} from "../services/obrasService.js";

import { salvarCapitulosDaObra } from "../services/capitulosService.js";
import { interpretarImportacaoWattpad } from "../utils/interpretarImportacaoWattpad.js";

export default function Obras() {
  const [obras, setObras] = useState([]);

  const [modalAberto, setModalAberto] = useState(false);
  const [abaModal, setAbaModal] = useState("console");

  const [linkImportacao, setLinkImportacao] = useState("");
  const [textoImportacaoManual, setTextoImportacaoManual] = useState("");

  const [importando, setImportando] = useState(false);
  const [previewImportacao, setPreviewImportacao] = useState(null);

  const [mensagem, setMensagem] = useState("");

  async function carregarObras() {
    try {
      const lista = await listarObras();
      setObras(lista);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar obras.");
    }
  }

  function abrirModalNovaObra() {
    setModalAberto(true);
    setPreviewImportacao(null);
    setMensagem("");
    setAbaModal("console");
  }

  function fecharModal() {
    setModalAberto(false);
    setPreviewImportacao(null);
    setLinkImportacao("");
    setTextoImportacaoManual("");
  }

  async function prepararImportacao(evento) {
    evento.preventDefault();

    if (!linkImportacao.trim()) {
      setMensagem("Cole o link da obra do Wattpad.");
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
      } else {
        setMensagem("Importação automática preparada com sucesso.");
      }
    } catch (erro) {
      console.error(erro);
      setMensagem(erro.message || "Erro ao importar obra do Wattpad.");
    } finally {
      setImportando(false);
    }
  }

  function prepararImportacaoManual(evento) {
    evento.preventDefault();

    if (!textoImportacaoManual.trim()) {
      setMensagem("Cole o texto gerado pelo bookmarklet do Wattpad.");
      return;
    }

    const dados = interpretarImportacaoWattpad(textoImportacaoManual);

    if (!dados.obra.titulo) {
      setMensagem("Não foi possível identificar o título da obra.");
      return;
    }

    if (!dados.capitulos.length) {
      setMensagem("Nenhum capítulo foi identificado na colagem.");
      return;
    }

    setPreviewImportacao({
      sucesso: true,
      fonte: "bookmarklet",
      obra: dados.obra,
      capitulos: dados.capitulos,
      totalCapitulos: dados.totalCapitulos,
      aviso: ""
    });

    setMensagem("Importação por colagem preparada com sucesso.");
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

      setMensagem("Obra salva com sucesso.");
      fecharModal();
      await carregarObras();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar obra.");
    } finally {
      setImportando(false);
    }
  }

  async function handleExcluir(obraId) {
    const confirmar = window.confirm("Tem certeza que deseja excluir esta obra?");

    if (!confirmar) return;

    try {
      await excluirObra(obraId);
      setMensagem("Obra removida.");
      await carregarObras();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao excluir obra.");
    }
  }

  useEffect(() => {
    carregarObras();
  }, []);

  return (
    <section className="page">
      <div className="page-title page-title-row">
        <div>
          <h2>Obras</h2>
          <p>Gerencie as obras cadastradas para conferência.</p>
        </div>

        <button type="button" className="button-primary" onClick={abrirModalNovaObra}>
          Nova Obra
        </button>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      {obras.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            Nenhuma obra cadastrada. Clique em Nova Obra para começar.
          </div>
        </div>
      ) : (
        <div className="works-grid">
          {obras.map((obra) => (
            <article className="work-card" key={obra.id}>
              <div className="work-cover">
                {obra.capa ? (
                  <img src={obra.capa} alt={`Capa da obra ${obra.titulo}`} />
                ) : (
                  <div className="obra-cover-placeholder">Sem capa</div>
                )}
              </div>

              <div className="work-info">
                <h3>{obra.titulo}</h3>

                <p>
                  {obra.autor || "Autor não informado"}
                  {obra.userAutor ? ` • @${obra.userAutor}` : ""}
                </p>

                <span>Wattpad ID: {obra.wattpadId || "-"}</span>
              </div>

              <div className="work-actions">
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
            </article>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="modal-backdrop">
          <div className="modal-card modal-large">
            <div className="modal-header">
              <div>
                <h3>Nova Obra</h3>
                <p>Importe automaticamente ou cole os metadados do bookmarklet.</p>
              </div>

              <button type="button" className="modal-close" onClick={fecharModal}>
                ×
              </button>
            </div>

            <div className="modal-tabs">
              <button
                type="button"
                className={abaModal === "console" ? "active" : ""}
                onClick={() => setAbaModal("console")}
              >
                Colagem do bookmarklet
              </button>

              <button
                type="button"
                className={abaModal === "link" ? "active" : ""}
                onClick={() => setAbaModal("link")}
              >
                Link da obra
              </button>
            </div>

            {abaModal === "console" && (
              <form className="form-grid" onSubmit={prepararImportacaoManual}>
                <label>
                  Texto copiado do Wattpad
                  <textarea
                    rows="10"
                    value={textoImportacaoManual}
                    onChange={(evento) =>
                      setTextoImportacaoManual(evento.target.value)
                    }
                    placeholder={`TÍTULO: Nome da obra
CAPA: https://...
LINK: https://www.wattpad.com/story/...

CAPÍTULOS:
1. Prólogo | https://www.wattpad.com/123456
2. A do meio | https://www.wattpad.com/789101`}
                  />
                </label>

                <button type="submit" className="button-secondary">
                  Preparar importação por colagem
                </button>
              </form>
            )}

            {abaModal === "link" && (
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
                  {importando ? "Importando..." : "Preparar importação automática"}
                </button>
              </form>
            )}

            {previewImportacao && (
              <div className="modal-preview">
                <h3>Prévia da importação</h3>

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

                    {previewImportacao.obra.link && (
                      <a
                        href={previewImportacao.obra.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir obra no Wattpad
                      </a>
                    )}
                  </div>
                </div>

                <div className="conference-summary-grid">
                  <div>
                    <span>Capítulos encontrados</span>
                    <strong>{previewImportacao.totalCapitulos}</strong>
                  </div>

                  <div>
                    <span>Fonte</span>
                    <strong>{previewImportacao.fonte}</strong>
                  </div>

                  <div>
                    <span>Wattpad ID</span>
                    <strong>{previewImportacao.obra.wattpadId || "-"}</strong>
                  </div>
                </div>

                <div className="table-wrapper preview-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Ordem</th>
                        <th>Título</th>
                        <th>Palavras</th>
                        <th>Parágrafos</th>
                      </tr>
                    </thead>

                    <tbody>
                      {previewImportacao.capitulos.map((capitulo) => (
                        <tr key={`${capitulo.ordem}-${capitulo.titulo}`}>
                          <td>{capitulo.ordem}</td>

                          <td>
                            {capitulo.link ? (
                              <a
                                href={capitulo.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {capitulo.titulo}
                              </a>
                            ) : (
                              capitulo.titulo
                            )}
                          </td>

                          <td>{capitulo.palavras}</td>
                          <td>{capitulo.paragrafos}</td>
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
                    Salvar obra no sistema
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
