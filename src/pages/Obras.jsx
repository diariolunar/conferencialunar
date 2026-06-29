import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  excluirObra,
  importarObraDoWattpad,
  listarObras,
  salvarObra
} from "../services/obrasService.js";

import {
  salvarCapitulosDaObra
} from "../services/capitulosService.js";
import {
  atualizarCapitulosDaObraEmLote,
  diagnosticarObras,
  formatarResumoAtualizacao
} from "../services/atualizacaoCapitulosService.js";
import { useDialog } from "../components/DialogProvider.jsx";
import FeedbackModal from "../components/FeedbackModal.jsx";
import { interpretarImportacoesWattpad } from "../utils/interpretarImportacaoWattpad.js";
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
  const [atualizandoObraId, setAtualizandoObraId] = useState("");
  const [atualizandoTodas, setAtualizandoTodas] = useState(false);
  const [cancelarAtualizacao, setCancelarAtualizacao] = useState(null);
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [relatorioObras, setRelatorioObras] = useState([]);

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

    const importacoes = interpretarImportacoesWattpad(textoImportacaoManual);
    const importacoesValidas = importacoes.filter((item) => item.obra.titulo);

    if (importacoesValidas.length === 0) {
      setMensagem("Título da obra não encontrado.");
      return;
    }

    setPreviewImportacao({
      sucesso: true,
      fonte: "bookmarklet",
      importacoes: importacoesValidas,
      obra: importacoesValidas[0].obra,
      capitulos: importacoesValidas[0].capitulos,
      totalCapitulos: importacoesValidas.reduce(
        (total, item) => total + item.totalCapitulos,
        0
      )
    });

    setMensagem("");
  }

  async function salvarImportacao() {
    if (!previewImportacao?.obra && !previewImportacao?.importacoes?.length) {
      return;
    }

    try {
      setImportando(true);

      const importacoes = previewImportacao.importacoes?.length
        ? previewImportacao.importacoes
        : [
            {
              obra: previewImportacao.obra,
              capitulos: previewImportacao.capitulos || [],
              totalCapitulos: previewImportacao.totalCapitulos || 0
            }
          ];

      let obrasSalvas = 0;
      let capitulosProcessados = 0;

      for (const importacao of importacoes) {
        setMensagem(
          `Salvando ${obrasSalvas + 1}/${importacoes.length}: ${importacao.obra.titulo}`
        );

        const obraId = await salvarObra(importacao.obra);

        if (importacao.capitulos?.length) {
          const resultado = await salvarCapitulosDaObra(
            obraId,
            importacao.capitulos
          );

          capitulosProcessados += resultado.total;
        }

        obrasSalvas += 1;
      }

      await carregarObras();
      fecharModal();

      setMensagem(
        `${obrasSalvas} obra(s) salva(s) com sucesso. ${capitulosProcessados} capítulo(s) processado(s).`
      );
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

  async function atualizarTodosCapitulosDaObra(obra) {
    const confirmar = await dialog.confirm({
      title: "Atualizar capítulos",
      message: `Deseja buscar palavras, parágrafos e comentários de todos os capítulos cadastrados em "${obra.titulo}"?`,
      confirmLabel: "Atualizar",
      variant: "default"
    });

    if (!confirmar) return;

    let cancelado = false;

    setAtualizandoObraId(obra.id);
    setCancelarAtualizacao(() => () => {
      cancelado = true;
      setMensagem("Cancelando após o capítulo atual...");
    });
    setMensagem(`Atualizando capítulos de "${obra.titulo}"...`);

    try {
      const resultado = await atualizarCapitulosDaObraEmLote({
        obra,
        onProgress: (progresso) => {
          if (progresso.etapa === "finalizado") return;

          setMensagem(
            `Atualizando ${progresso.atual}/${progresso.total}: ${progresso.titulo}`
          );
        },
        isCancelled: () => cancelado
      });

      setMensagem(formatarResumoAtualizacao(resultado));
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao atualizar capítulos da obra.");
    } finally {
      setAtualizandoObraId("");
      setCancelarAtualizacao(null);
    }
  }

  async function atualizarTodasObrasComCapitulosZerados() {
    const confirmar = await dialog.confirm({
      title: "Atualizar todas",
      message:
        "Deseja atualizar os capítulos zerados de todas as obras? Obras sem capítulos zerados serão puladas.",
      confirmLabel: "Atualizar todas",
      variant: "default"
    });

    if (!confirmar) return;

    let cancelado = false;

    setAtualizandoTodas(true);
    setAtualizandoObraId("__todas__");
    setCancelarAtualizacao(() => () => {
      cancelado = true;
      setMensagem("Cancelando após o capítulo atual...");
    });
    setMensagem("Procurando obras com capítulos zerados...");

    try {
      const relatorio = await diagnosticarObras(obras);
      const obrasComZerados = relatorio
        .map((item) => ({
          ...item,
          capitulosZerados: item.capitulos.filter((capitulo) => {
            const palavras = Number(capitulo.palavras || 0);
            const paragrafos = Number(capitulo.paragrafos || 0);
            const temLinkOuId = Boolean(capitulo.link || capitulo.wattpadId);

            return temLinkOuId && (palavras <= 0 || paragrafos <= 0);
          })
        }))
        .filter((item) => item.capitulosZerados.length > 0);

      if (obrasComZerados.length === 0) {
        setRelatorioObras(relatorio);
        setMensagem("Nenhuma obra com capítulos zerados para atualizar.");
        return;
      }

      let obrasAtualizadas = 0;
      let capitulosAtualizados = 0;
      let falhas = 0;

      for (let indice = 0; indice < obrasComZerados.length; indice += 1) {
        if (cancelado) break;

        const item = obrasComZerados[indice];

        setMensagem(
          `Atualizando obra ${indice + 1}/${obrasComZerados.length}: ${item.obra.titulo}`
        );

        const resultado = await atualizarCapitulosDaObraEmLote({
          obra: item.obra,
          capitulos: item.capitulosZerados,
          onProgress: (progresso) => {
            if (progresso.etapa === "finalizado") return;

            setMensagem(
              `Obra ${indice + 1}/${obrasComZerados.length} - capítulo ${progresso.atual}/${progresso.total}: ${progresso.titulo}`
            );
          },
          isCancelled: () => cancelado
        });

        if (resultado.atualizados > 0) obrasAtualizadas += 1;
        capitulosAtualizados += resultado.atualizados;
        falhas += resultado.falhas;
      }

      await carregarObras();
      setRelatorioObras(await diagnosticarObras(obras));

      setMensagem(
        `${cancelado ? "Atualização cancelada." : "Atualização concluída."} ${obrasAtualizadas} obra(s) atualizada(s), ${capitulosAtualizados} capítulo(s) corrigido(s), ${falhas} falha(s).`
      );
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao atualizar todas as obras.");
    } finally {
      setAtualizandoTodas(false);
      setAtualizandoObraId("");
      setCancelarAtualizacao(null);
    }
  }

  async function carregarRelatorioObras() {
    setDiagnosticando(true);
    setMensagem("Analisando obras e capítulos cadastrados...");

    try {
      const relatorio = await diagnosticarObras(obras);

      setRelatorioObras(relatorio);
      setMensagem(
        `${relatorio.filter((item) => item.precisaAtencao).length} obra(s) precisam de atenção.`
      );
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao gerar relatório das obras.");
    } finally {
      setDiagnosticando(false);
    }
  }

  const importacoesPreview = previewImportacao
    ? previewImportacao.importacoes?.length
      ? previewImportacao.importacoes
      : [
          {
            obra: previewImportacao.obra,
            capitulos: previewImportacao.capitulos || [],
            totalCapitulos: previewImportacao.totalCapitulos || 0
          }
        ]
    : [];
  const importacaoUnica = importacoesPreview.length === 1;

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
        carregando={
          importando ||
          Boolean(atualizandoObraId) ||
          atualizandoTodas ||
          diagnosticando
        }
        onCancel={cancelarAtualizacao}
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

        <div className="actions-row report-actions">
          <button
            type="button"
            className="button-primary"
            onClick={atualizarTodasObrasComCapitulosZerados}
            disabled={
              atualizandoTodas ||
              Boolean(atualizandoObraId) ||
              diagnosticando ||
              obras.length === 0
            }
          >
            {atualizandoTodas ? "Atualizando todas..." : "Atualizar todos"}
          </button>

          <button
            type="button"
            className="button-secondary"
            onClick={carregarRelatorioObras}
            disabled={
              atualizandoTodas ||
              Boolean(atualizandoObraId) ||
              diagnosticando ||
              obras.length === 0
            }
          >
            {diagnosticando ? "Analisando..." : "Diagnosticar obras"}
          </button>
        </div>

        {relatorioObras.length > 0 && (
          <div className="works-report">
            {relatorioObras.slice(0, 8).map((item) => (
              <div
                className={`works-report-item ${
                  item.precisaAtencao ? "works-report-warning" : ""
                }`}
                key={item.obra.id}
              >
                <div>
                  <strong>{item.obra.titulo}</strong>
                  <span>
                    {item.resumo.total} capítulo(s) •{" "}
                    {item.resumo.precisamAtualizar} para atualizar •{" "}
                    {item.resumo.semLinkOuId} sem link/ID
                  </span>
                </div>

                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => atualizarTodosCapitulosDaObra(item.obra)}
                  disabled={atualizandoTodas || Boolean(atualizandoObraId)}
                >
                  Atualizar
                </button>
              </div>
            ))}
          </div>
        )}

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
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => atualizarTodosCapitulosDaObra(obra)}
                    disabled={atualizandoTodas || Boolean(atualizandoObraId)}
                  >
                    {atualizandoObraId === obra.id
                      ? "Atualizando..."
                      : "Atualizar capítulos"}
                  </button>

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
                <p>Importe uma ou várias obras do Wattpad.</p>
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
                  Cole um ou vários blocos copiados do Wattpad
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
2. Capítulo 1 | https://www.wattpad.com/789101

TÍTULO: Outra obra
CAPÍTULOS:
1. Capítulo 1 | https://www.wattpad.com/112233`}
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
                <div className="bulk-import-summary">
                  <div>
                    <span>Prévia da importação</span>
                    <strong>
                      {importacoesPreview.length} obra(s) encontrada(s)
                    </strong>
                  </div>

                  <div>
                    <span>Capítulos</span>
                    <strong>{previewImportacao.totalCapitulos}</strong>
                  </div>
                </div>

                <div className="bulk-import-list">
                  {importacoesPreview.map((importacao, indice) => (
                    <div
                      className="bulk-import-work"
                      key={`${importacao.obra.titulo}-${indice}`}
                    >
                      <div className="bulk-import-work-header">
                        {importacao.obra.capa ? (
                          <img
                            src={importacao.obra.capa}
                            alt={importacao.obra.titulo}
                          />
                        ) : (
                          <div className="bulk-import-cover-placeholder">
                            Sem capa
                          </div>
                        )}

                        <div>
                          <h3>{importacao.obra.titulo}</h3>

                          <p>
                            {importacao.obra.autor || "Autor não informado"}
                            {importacao.obra.userAutor
                              ? ` • @${importacao.obra.userAutor}`
                              : ""}
                          </p>

                          <p>
                            Capítulos encontrados:{" "}
                            <strong>{importacao.totalCapitulos}</strong>
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
                            {importacao.capitulos
                              .slice(0, importacaoUnica ? undefined : 6)
                              .map((capitulo) => (
                                <tr
                                  key={`${capitulo.ordem}-${capitulo.titulo}`}
                                >
                                  <td>{capitulo.ordem}</td>
                                  <td>{capitulo.titulo}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      {!importacaoUnica && importacao.capitulos.length > 6 && (
                        <p className="bulk-import-more">
                          +{importacao.capitulos.length - 6} capítulo(s) nesta
                          obra
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="actions-row">
                  <button
                    type="button"
                    className="button-primary"
                    onClick={salvarImportacao}
                    disabled={importando}
                  >
                    {importando
                      ? "Salvando..."
                      : `Salvar ${importacoesPreview.length} obra(s)`}
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
