import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  buscarObraExistente,
  excluirObra,
  importarObraDoWattpad,
  listarObras,
  salvarObra,
  substituirObra
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
import { decidirCapituloSemPalavras } from "../utils/decidirCapituloSemPalavras.js";
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
  const [sincronizandoTodas, setSincronizandoTodas] = useState(false);
  const [cancelarAtualizacao, setCancelarAtualizacao] = useState(null);
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [relatorioObras, setRelatorioObras] = useState([]);

  function tratarCapituloSemPalavras(contexto) {
    return decidirCapituloSemPalavras({ dialog, ...contexto });
  }

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

    const importacoes = previewImportacao.importacoes?.length
      ? previewImportacao.importacoes
      : [
          {
            obra: previewImportacao.obra,
            capitulos: previewImportacao.capitulos || [],
            totalCapitulos: previewImportacao.totalCapitulos || 0
          }
        ];

    try {
      const importacoesConfirmadas = [];

      for (const importacao of importacoes) {
        const obraExistente = await buscarObraExistente(importacao.obra);

        if (!obraExistente) {
          importacoesConfirmadas.push({ importacao, obraExistente: null });
          continue;
        }

        const substituir = await dialog.confirm({
          title: "Obra já cadastrada",
          message:
            `A obra "${obraExistente.titulo}" já está cadastrada.\n\n` +
            "Deseja apagar completamente a obra atual e todos os capítulos dela para cadastrar esta nova versão?",
          confirmLabel: "Substituir obra",
          cancelLabel: "Não substituir",
          variant: "danger"
        });

        if (substituir) {
          importacoesConfirmadas.push({ importacao, obraExistente });
        }
      }

      if (importacoesConfirmadas.length === 0) {
        setMensagem("Nenhuma obra foi cadastrada.");
        return;
      }

      setImportando(true);

      let obrasSalvas = 0;
      let capitulosProcessados = 0;
      let obrasSubstituidas = 0;
      const obrasIgnoradas = importacoes.length - importacoesConfirmadas.length;
      let capitulosAtualizados = 0;
      let capitulosIgnorados = 0;
      let falhasAtualizacao = 0;

      for (const item of importacoesConfirmadas) {
        const { importacao, obraExistente } = item;

        setMensagem(
          `Salvando ${obrasSalvas + 1}/${importacoesConfirmadas.length}: ${importacao.obra.titulo}`
        );

        const obraId = obraExistente
          ? await substituirObra(obraExistente.id, importacao.obra)
          : await salvarObra(importacao.obra);

        if (obraExistente) obrasSubstituidas += 1;

        if (importacao.capitulos?.length) {
          const resultado = await salvarCapitulosDaObra(
            obraId,
            importacao.capitulos
          );

          capitulosProcessados += resultado.total;
        }

        const resultadoAtualizacao = await atualizarCapitulosDaObraEmLote({
          obra: {
            ...importacao.obra,
            id: obraId
          },
          onProgress: (progresso) => {
            if (progresso.etapa !== "atualizando") return;

            setMensagem(
              `Atualizando obra ${obrasSalvas + 1}/${importacoesConfirmadas.length} - ` +
                `capítulo ${progresso.atual}/${progresso.total}: ${progresso.titulo}`
            );
          },
          onZeroPalavras: tratarCapituloSemPalavras
        });

        capitulosAtualizados += resultadoAtualizacao.atualizados;
        capitulosIgnorados += resultadoAtualizacao.ignorados;
        falhasAtualizacao += resultadoAtualizacao.falhas;

        obrasSalvas += 1;
      }

      await carregarObras();
      fecharModal();

      setMensagem(
        `${obrasSalvas} obra(s) salva(s) com sucesso` +
          `${obrasSubstituidas ? `, ${obrasSubstituidas} substituída(s)` : ""}. ` +
          `${obrasIgnoradas ? `${obrasIgnoradas} não substituída(s). ` : ""}` +
          `${capitulosProcessados} capítulo(s) cadastrado(s) e ` +
          `${capitulosAtualizados} atualizado(s) automaticamente. ` +
          `${capitulosIgnorados} ignorado(s). ` +
          `${falhasAtualizacao} falha(s) na atualização.`
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
        onZeroPalavras: tratarCapituloSemPalavras,
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

  async function atualizarTodosCapitulosDeTodasObras() {
    const confirmar = await dialog.confirm({
      title: "Atualizar todas",
      message:
        "Deseja atualizar todos os capítulos de todas as obras? O processo pode demorar. Capítulos ignorados ou sem link/ID serão pulados.",
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
    setMensagem("Preparando todos os capítulos para atualização...");

    try {
      const relatorio = await diagnosticarObras(obras);
      const obrasParaAtualizar = relatorio
        .map((item) => ({
          ...item,
          capitulosParaAtualizar: item.capitulos.filter((capitulo) => {
            const temLinkOuId = Boolean(capitulo.link || capitulo.wattpadId);

            return !capitulo.atualizacaoIgnorada && temLinkOuId;
          })
        }))
        .filter((item) => item.capitulosParaAtualizar.length > 0);

      if (obrasParaAtualizar.length === 0) {
        const pendentes = relatorio.filter((item) => item.precisaAtencao);
        setRelatorioObras(pendentes);
        setMensagem(
          pendentes.length
            ? `Nenhum capítulo elegível para atualizar. ${pendentes.length} obra(s) ainda precisam de atenção.`
            : "Nenhum capítulo elegível para atualizar. Todas as obras estão em ordem."
        );
        return;
      }

      let obrasAtualizadas = 0;
      let capitulosAtualizados = 0;
      let capitulosIgnorados = 0;
      let falhas = 0;

      for (let indice = 0; indice < obrasParaAtualizar.length; indice += 1) {
        if (cancelado) break;

        const item = obrasParaAtualizar[indice];

        setMensagem(
          `Atualizando obra ${indice + 1}/${obrasParaAtualizar.length}: ${item.obra.titulo}`
        );

        const resultado = await atualizarCapitulosDaObraEmLote({
          obra: item.obra,
          capitulos: item.capitulosParaAtualizar,
          onProgress: (progresso) => {
            if (progresso.etapa === "finalizado") return;

            setMensagem(
              `Obra ${indice + 1}/${obrasParaAtualizar.length} - capítulo ${progresso.atual}/${progresso.total}: ${progresso.titulo}`
            );
          },
          onZeroPalavras: tratarCapituloSemPalavras,
          isCancelled: () => cancelado
        });

        if (resultado.atualizados > 0) obrasAtualizadas += 1;
        capitulosAtualizados += resultado.atualizados;
        capitulosIgnorados += resultado.ignorados;
        falhas += resultado.falhas;
      }

      await carregarObras();
      const relatorioFinal = await diagnosticarObras(obras);
      const obrasAindaPendentes = relatorioFinal.filter(
        (item) => item.precisaAtencao
      );
      setRelatorioObras(obrasAindaPendentes);

      setMensagem(
        `${cancelado ? "Atualização cancelada." : "Atualização concluída."} ${obrasAtualizadas} obra(s) atualizada(s), ${capitulosAtualizados} capítulo(s) processado(s), ${capitulosIgnorados} ignorado(s), ${falhas} falha(s). ${obrasAindaPendentes.length} obra(s) ainda precisam de atenção.`
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
      const relatorio = await diagnosticarObras(obras, {
        compararComWattpad: true,
        onProgress: ({ atual, total, obra }) => {
          setMensagem(
            `Comparando obra ${atual}/${total} com o Wattpad: ${obra.titulo}`
          );
        }
      });

      const obrasComAtencao = relatorio.filter((item) => item.precisaAtencao);
      setRelatorioObras(obrasComAtencao);
      setMensagem(
        obrasComAtencao.length
          ? `${obrasComAtencao.length} obra(s) precisam de atenção.`
          : "Todas as obras estão em ordem."
      );
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao gerar relatório das obras.");
    } finally {
      setDiagnosticando(false);
    }
  }

  async function executarSincronizacao(item, onProgress = null) {
    const comparacao = item.comparacaoWattpad;
    const dadosWattpad = comparacao?.dadosWattpad;

    if (!dadosWattpad?.obra) {
      throw new Error("Não há dados do Wattpad disponíveis para sincronizar.");
    }

    const obraWattpad = dadosWattpad.obra;
    const obraSincronizada = {
      ...item.obra,
      ...obraWattpad,
      autor: obraWattpad.autor || item.obra.autor || "",
      userAutor: obraWattpad.userAutor || item.obra.userAutor || "",
      descricao: obraWattpad.descricao || item.obra.descricao || "",
      capa: obraWattpad.capa || item.obra.capa || ""
    };

    await substituirObra(item.obra.id, obraSincronizada);
    await salvarCapitulosDaObra(item.obra.id, dadosWattpad.capitulos || []);

    const resultado = await atualizarCapitulosDaObraEmLote({
      obra: { ...obraSincronizada, id: item.obra.id },
      onProgress,
      onZeroPalavras: tratarCapituloSemPalavras
    });

    return {
      obraSincronizada,
      resultado,
      totalCapitulos: dadosWattpad.capitulos?.length || 0
    };
  }

  async function sincronizarObraDoRelatorio(item) {
    const comparacao = item.comparacaoWattpad;

    if (!comparacao?.dadosWattpad?.obra) {
      setMensagem("Não há dados do Wattpad disponíveis para sincronizar.");
      return;
    }

    const confirmar = await dialog.confirm({
      title: "Sincronizar obra",
      message:
        `Deseja substituir a versão cadastrada de “${item.obra.titulo}” pela versão atual do Wattpad? ` +
        `${comparacao.capitulosNovos.length} capítulo(s) novo(s), ` +
        `${comparacao.capitulosRemovidos.length} removido(s) e ` +
        `${comparacao.capitulosAlterados.length} alterado(s) foram identificados.`,
      confirmLabel: "Sincronizar",
      variant: "danger"
    });

    if (!confirmar) return;

    setAtualizandoObraId(item.obra.id);
    setMensagem(`Sincronizando ${item.obra.titulo}...`);

    try {
      const { obraSincronizada, resultado, totalCapitulos } =
        await executarSincronizacao(item, (progresso) => {
          if (progresso.etapa === "finalizado") return;
          setMensagem(
            `Sincronizando capítulo ${progresso.atual}/${progresso.total}: ${progresso.titulo}`
          );
        });

      await carregarObras();
      setRelatorioObras((atual) =>
        atual.filter((relatorio) => relatorio.obra.id !== item.obra.id)
      );
      setMensagem(
        `“${obraSincronizada.titulo}” sincronizada: ${totalCapitulos} capítulo(s) cadastrado(s), ${resultado.atualizados} atualizado(s), ${resultado.ignorados} ignorado(s) e ${resultado.falhas} falha(s).`
      );
    } catch (erro) {
      console.error(erro);
      setMensagem(erro.message || "Erro ao sincronizar obra.");
    } finally {
      setAtualizandoObraId("");
    }
  }

  async function sincronizarTodasObrasDoRelatorio() {
    const fila = relatorioObras.filter(
      (item) =>
        item.comparacaoWattpad?.temDiferencas &&
        !item.comparacaoWattpad?.comparacaoIncompleta &&
        item.comparacaoWattpad?.dadosWattpad?.obra
    );

    if (!fila.length) {
      setMensagem("Nenhuma obra está pronta para sincronização.");
      return;
    }

    const confirmar = await dialog.confirm({
      title: "Sincronizar todas",
      message:
        `${fila.length} obra(s) serão colocadas em fila e substituídas, uma por vez, pelas versões atuais do Wattpad. ` +
        "Deseja continuar?",
      confirmLabel: `Sincronizar ${fila.length} obra(s)`,
      variant: "danger"
    });

    if (!confirmar) return;

    let cancelado = false;
    const idsSincronizados = new Set();
    let concluidas = 0;
    let falhas = 0;
    let capitulosAtualizados = 0;
    let capitulosIgnorados = 0;

    setSincronizandoTodas(true);
    setAtualizandoObraId("__sincronizacao_todas__");
    setCancelarAtualizacao(() => () => {
      cancelado = true;
      setMensagem("Cancelando após concluir a obra atual...");
    });

    for (let indice = 0; indice < fila.length; indice += 1) {
      if (cancelado) break;

      const item = fila[indice];
      setMensagem(
        `Sincronizando obra ${indice + 1}/${fila.length}: ${item.obra.titulo}`
      );

      try {
        const { resultado } = await executarSincronizacao(
          item,
          (progresso) => {
            if (progresso.etapa === "finalizado") return;
            setMensagem(
              `Obra ${indice + 1}/${fila.length} • capítulo ${progresso.atual}/${progresso.total}: ${progresso.titulo}`
            );
          }
        );

        idsSincronizados.add(item.obra.id);
        concluidas += 1;
        capitulosAtualizados += resultado.atualizados;
        capitulosIgnorados += resultado.ignorados;
        falhas += resultado.falhas;
      } catch (erro) {
        console.error(erro);
        falhas += 1;
      }
    }

    await carregarObras();
    setRelatorioObras((atual) =>
      atual.filter((item) => !idsSincronizados.has(item.obra.id))
    );
    setMensagem(
      `${cancelado ? "Sincronização cancelada." : "Fila concluída."} ${concluidas} obra(s) sincronizada(s), ${capitulosAtualizados} capítulo(s) atualizado(s), ${capitulosIgnorados} ignorado(s) e ${falhas} falha(s).`
    );
    setSincronizandoTodas(false);
    setAtualizandoObraId("");
    setCancelarAtualizacao(null);
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
  const obrasSincronizaveis = relatorioObras.filter(
    (item) =>
      item.comparacaoWattpad?.temDiferencas &&
      !item.comparacaoWattpad?.comparacaoIncompleta &&
      item.comparacaoWattpad?.dadosWattpad?.obra
  );

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
          sincronizandoTodas ||
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
            onClick={atualizarTodosCapitulosDeTodasObras}
            disabled={
              atualizandoTodas ||
              sincronizandoTodas ||
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
              sincronizandoTodas ||
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
            {obrasSincronizaveis.length > 0 && (
              <div className="actions-row report-actions">
                <button
                  type="button"
                  className="button-primary"
                  onClick={sincronizarTodasObrasDoRelatorio}
                  disabled={
                    sincronizandoTodas ||
                    atualizandoTodas ||
                    Boolean(atualizandoObraId)
                  }
                >
                  {sincronizandoTodas
                    ? "Sincronizando fila..."
                    : `Sincronizar todas (${obrasSincronizaveis.length})`}
                </button>
              </div>
            )}

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
                    {item.resumo.semMetricas} sem palavras •{" "}
                    {item.resumo.antigos} desatualizado(s) •{" "}
                    {item.resumo.ignorados} ignorado(s) •{" "}
                    {item.resumo.semLinkOuId} sem link/ID
                  </span>
                  {item.comparacaoWattpad?.temDiferencas && (
                    <span>
                      Wattpad: {item.comparacaoWattpad.capitulosNovos.length}{" "}
                      novo(s) •{" "}
                      {item.comparacaoWattpad.capitulosRemovidos.length}{" "}
                      removido(s) •{" "}
                      {item.comparacaoWattpad.capitulosAlterados.length}{" "}
                      alterado(s)
                      {item.comparacaoWattpad.camposObraAlterados.length
                        ? ` • dados alterados: ${item.comparacaoWattpad.camposObraAlterados.join(
                            ", "
                          )}`
                        : ""}
                    </span>
                  )}
                  {item.comparacaoWattpad?.comparacaoIncompleta && (
                    <span>
                      O Wattpad não retornou a lista de capítulos; nenhuma remoção
                      foi presumida.
                    </span>
                  )}
                  {item.erroComparacaoWattpad && (
                    <span>Comparação indisponível: {item.erroComparacaoWattpad}</span>
                  )}
                </div>

                {item.comparacaoWattpad?.temDiferencas &&
                !item.comparacaoWattpad?.comparacaoIncompleta ? (
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => sincronizarObraDoRelatorio(item)}
                    disabled={
                      sincronizandoTodas ||
                      atualizandoTodas ||
                      Boolean(atualizandoObraId)
                    }
                  >
                    {atualizandoObraId === item.obra.id
                      ? "Sincronizando..."
                      : "Sincronizar"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => atualizarTodosCapitulosDaObra(item.obra)}
                    disabled={
                      sincronizandoTodas ||
                      atualizandoTodas ||
                      Boolean(atualizandoObraId)
                    }
                  >
                    Atualizar
                  </button>
                )}
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
                    disabled={
                      sincronizandoTodas ||
                      atualizandoTodas ||
                      Boolean(atualizandoObraId)
                    }
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
