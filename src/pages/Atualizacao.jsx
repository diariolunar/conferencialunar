import { useEffect, useState } from "react";

import FeedbackModal from "../components/FeedbackModal.jsx";
import { useDialog } from "../components/DialogProvider.jsx";
import {
  atualizarObra,
  importarObraDoWattpad,
  listarObras
} from "../services/obrasService.js";
import {
  listarCapitulosDaObra,
  salvarCapitulosDaObra
} from "../services/capitulosService.js";
import {
  atualizarCapitulosDaObraEmLote,
  diagnosticarObras
} from "../services/atualizacaoCapitulosService.js";
import { decidirCapituloSemPalavras } from "../utils/decidirCapituloSemPalavras.js";
import { compararObraComWattpad } from "../utils/compararObraWattpad.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";

function obterLinkObra(obra = {}) {
  return (
    obra.link ||
    (obra.wattpadId
      ? `https://www.wattpad.com/story/${obra.wattpadId}`
      : "")
  );
}

function dadosDaObraAtualizados(obra, dadosWattpad, linkObra) {
  return {
    titulo: dadosWattpad.obra?.titulo || obra.titulo || "",
    autor: dadosWattpad.obra?.autor || obra.autor || "",
    userAutor: dadosWattpad.obra?.userAutor || obra.userAutor || "",
    descricao: dadosWattpad.obra?.descricao || obra.descricao || "",
    capa: dadosWattpad.obra?.capa || obra.capa || "",
    link: dadosWattpad.obra?.link || obra.link || linkObra,
    wattpadId: dadosWattpad.obra?.wattpadId || obra.wattpadId || ""
  };
}

function selecionarCapitulosNovos(capitulos, novos) {
  const ids = new Set(
    novos.map((capitulo) => String(capitulo.wattpadId || "")).filter(Boolean)
  );
  const titulos = new Set(
    novos
      .map((capitulo) => normalizarTexto(capitulo.titulo || ""))
      .filter(Boolean)
  );

  return capitulos.filter(
    (capitulo) =>
      ids.has(String(capitulo.wattpadId || "")) ||
      titulos.has(normalizarTexto(capitulo.titulo || ""))
  );
}

export default function Atualizacao() {
  const dialog = useDialog();
  const [obras, setObras] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [operacao, setOperacao] = useState("");
  const [cancelarOperacao, setCancelarOperacao] = useState(null);
  const [relatorio, setRelatorio] = useState([]);
  const [falhasDetalhadas, setFalhasDetalhadas] = useState([]);

  const carregando = Boolean(operacao);

  async function carregarObras() {
    const lista = await listarObras();
    setObras(lista);
    return lista;
  }

  useEffect(() => {
    carregarObras().catch((erro) => {
      console.error(erro);
      setMensagem("Erro ao carregar obras.");
    });
  }, []);

  function prepararOperacao(nome, mensagemInicial) {
    let cancelada = false;

    setOperacao(nome);
    setMensagem(mensagemInicial);
    setFalhasDetalhadas([]);
    setCancelarOperacao(() => () => {
      cancelada = true;
      setMensagem("Cancelando após concluir a obra atual...");
    });

    return () => cancelada;
  }

  function finalizarOperacao() {
    setOperacao("");
    setCancelarOperacao(null);
  }

  function tratarCapituloSemPalavras(contexto) {
    return decidirCapituloSemPalavras({ dialog, ...contexto });
  }

  function registrarFalha(falha = {}) {
    setFalhasDetalhadas((atual) => [
      ...atual,
      {
        obra: falha.obra || "Obra não identificada",
        capitulo: falha.capitulo || "",
        etapa: falha.etapa || "Atualização",
        mensagem: falha.mensagem || "Erro não informado."
      }
    ]);
  }

  async function executarDiagnostico() {
    const confirmar = await dialog.confirm({
      title: "Diagnosticar obras",
      message: "Verificar a situação dos capítulos cadastrados em todas as obras?",
      confirmLabel: "Diagnosticar",
      variant: "default"
    });
    if (!confirmar) return;

    setOperacao("diagnostico");
    setMensagem("Analisando obras e capítulos cadastrados...");
    setFalhasDetalhadas([]);
    try {
      const resultado = await diagnosticarObras(obras);
      const pendentes = resultado.filter((item) => item.precisaAtencao);
      setRelatorio(pendentes);
      setMensagem(
        pendentes.length
          ? `${pendentes.length} obra(s) precisam de atenção.`
          : "Todas as obras estão em ordem."
      );
    } catch (erro) {
      console.error(erro);
      registrarFalha({ etapa: "Diagnóstico", mensagem: erro.message });
      setMensagem("Erro ao gerar diagnóstico das obras.");
    } finally {
      finalizarOperacao();
    }
  }

  async function executarAtualizacaoObras() {
    const confirmar = await dialog.confirm({
      title: "Atualizar dados das obras",
      message:
        "Buscar no Wattpad e atualizar título, autor, capa, descrição e link de todas as obras?",
      confirmLabel: "Atualizar obras",
      variant: "default"
    });
    if (!confirmar) return;

    const foiCancelada = prepararOperacao(
      "obras",
      "Preparando atualização dos dados das obras..."
    );
    let atualizadas = 0;
    let falhas = 0;

    try {
      for (let indice = 0; indice < obras.length; indice += 1) {
        if (foiCancelada()) break;
        const obra = obras[indice];
        setMensagem(
          `Atualizando dados da obra ${indice + 1}/${obras.length}: ${obra.titulo}`
        );

        try {
          const linkObra = obterLinkObra(obra);
          if (!linkObra) throw new Error("Obra sem link ou ID do Wattpad.");
          const dadosWattpad = await importarObraDoWattpad(linkObra);
          await atualizarObra(
            obra.id,
            dadosDaObraAtualizados(obra, dadosWattpad, linkObra)
          );
          atualizadas += 1;
        } catch (erro) {
          console.error(erro);
          falhas += 1;
          registrarFalha({
            obra: obra.titulo,
            etapa: "Dados da obra",
            mensagem: erro.message
          });
        }
      }

      await carregarObras();
      setMensagem(
        `${foiCancelada() ? "Atualização cancelada." : "Atualização concluída."} ${atualizadas} obra(s) atualizada(s) e ${falhas} falha(s).`
      );
    } catch (erro) {
      console.error(erro);
      registrarFalha({ etapa: "Dados das obras", mensagem: erro.message });
      setMensagem("Erro ao atualizar os dados das obras.");
    } finally {
      finalizarOperacao();
    }
  }

  async function executarAtualizacaoCapitulos() {
    const confirmar = await dialog.confirm({
      title: "Atualizar dados dos capítulos",
      message:
        "Buscar palavras, parágrafos e comentários de todos os capítulos cadastrados? Capítulos ignorados ou sem link/ID serão pulados.",
      confirmLabel: "Atualizar capítulos",
      variant: "default"
    });
    if (!confirmar) return;

    const foiCancelada = prepararOperacao(
      "capitulos",
      "Preparando atualização dos capítulos..."
    );
    let obrasProcessadas = 0;
    let capitulosAtualizados = 0;
    let ignorados = 0;
    let falhas = 0;

    try {
      for (let indice = 0; indice < obras.length; indice += 1) {
        if (foiCancelada()) break;
        const obra = obras[indice];
        const capitulos = await listarCapitulosDaObra(obra.id);
        const elegiveis = capitulos.filter(
          (capitulo) =>
            !capitulo.atualizacaoIgnorada &&
            Boolean(capitulo.link || capitulo.wattpadId)
        );
        if (!elegiveis.length) continue;

        const resultado = await atualizarCapitulosDaObraEmLote({
          obra,
          capitulos: elegiveis,
          onProgress: (progresso) => {
            if (progresso.etapa === "finalizado") return;
            setMensagem(
              `Obra ${indice + 1}/${obras.length} • capítulo ${progresso.atual}/${progresso.total}: ${progresso.titulo}`
            );
          },
          onZeroPalavras: tratarCapituloSemPalavras,
          isCancelled: foiCancelada
        });

        obrasProcessadas += 1;
        capitulosAtualizados += resultado.atualizados;
        ignorados += resultado.ignorados;
        falhas += resultado.falhas;
        (resultado.erros || []).forEach((erro) => {
          registrarFalha({
            obra: obra.titulo,
            capitulo: erro.titulo || erro.capituloId,
            etapa: "Dados do capítulo",
            mensagem: erro.mensagem
          });
        });
      }

      await carregarObras();
      setMensagem(
        `${foiCancelada() ? "Atualização cancelada." : "Atualização concluída."} ${obrasProcessadas} obra(s) processada(s), ${capitulosAtualizados} capítulo(s) atualizado(s), ${ignorados} ignorado(s) e ${falhas} falha(s).`
      );
    } catch (erro) {
      console.error(erro);
      registrarFalha({ etapa: "Dados dos capítulos", mensagem: erro.message });
      setMensagem("Erro ao atualizar os dados dos capítulos.");
    } finally {
      finalizarOperacao();
    }
  }

  async function executarBuscaNovosCapitulos() {
    const confirmar = await dialog.confirm({
      title: "Buscar novos capítulos",
      message:
        "Consultar todas as obras no Wattpad e cadastrar os capítulos que ainda não existem no sistema?",
      confirmLabel: "Buscar capítulos",
      variant: "default"
    });
    if (!confirmar) return;

    const foiCancelada = prepararOperacao(
      "novos-capitulos",
      "Preparando busca de novos capítulos..."
    );
    let obrasComNovos = 0;
    let novosEncontrados = 0;
    let capitulosProcessados = 0;
    let falhas = 0;

    try {
      for (let indice = 0; indice < obras.length; indice += 1) {
        if (foiCancelada()) break;
        const obra = obras[indice];
        setMensagem(
          `Buscando novos capítulos ${indice + 1}/${obras.length}: ${obra.titulo}`
        );

        try {
          const linkObra = obterLinkObra(obra);
          if (!linkObra) throw new Error("Obra sem link ou ID do Wattpad.");
          const dadosWattpad = await importarObraDoWattpad(linkObra);
          const locais = await listarCapitulosDaObra(obra.id);
          const comparacao = compararObraComWattpad({
            obraLocal: obra,
            capitulosLocais: locais,
            dadosWattpad
          });
          const novos = comparacao.capitulosNovos || [];
          if (!novos.length) continue;

          await salvarCapitulosDaObra(obra.id, novos);
          const cadastrados = await listarCapitulosDaObra(obra.id);
          const novosCadastrados = selecionarCapitulosNovos(cadastrados, novos);
          const resultado = await atualizarCapitulosDaObraEmLote({
            obra: { ...obra, ...(dadosWattpad.obra || {}) },
            capitulos: novosCadastrados,
            onProgress: (progresso) => {
              if (progresso.etapa === "finalizado") return;
              setMensagem(
                `Processando capítulo novo ${progresso.atual}/${progresso.total}: ${progresso.titulo}`
              );
            },
            onZeroPalavras: tratarCapituloSemPalavras,
            isCancelled: foiCancelada
          });

          obrasComNovos += 1;
          novosEncontrados += novos.length;
          capitulosProcessados += resultado.atualizados;
          falhas += resultado.falhas;
          (resultado.erros || []).forEach((erro) => {
            registrarFalha({
              obra: obra.titulo,
              capitulo: erro.titulo || erro.capituloId,
              etapa: "Novo capítulo",
              mensagem: erro.mensagem
            });
          });
        } catch (erro) {
          console.error(erro);
          falhas += 1;
          registrarFalha({
            obra: obra.titulo,
            etapa: "Busca de novos capítulos",
            mensagem: erro.message
          });
        }
      }

      await carregarObras();
      setMensagem(
        `${foiCancelada() ? "Busca cancelada." : "Busca concluída."} ${obrasComNovos} obra(s) com novidades, ${novosEncontrados} capítulo(s) novo(s) cadastrado(s), ${capitulosProcessados} processado(s) e ${falhas} falha(s).`
      );
    } catch (erro) {
      console.error(erro);
      registrarFalha({ etapa: "Busca de novos capítulos", mensagem: erro.message });
      setMensagem("Erro ao buscar novos capítulos.");
    } finally {
      finalizarOperacao();
    }
  }

  return (
    <section className="page">
      <div className="page-title">
        <h2>Atualização</h2>
        <p>Escolha uma atualização para executar em todas as obras cadastradas.</p>
      </div>

      <FeedbackModal
        mensagem={mensagem}
        carregando={carregando}
        onCancel={cancelarOperacao}
        onClose={() => setMensagem("")}
      />

      <div className="card">
        <div className="works-report">
          <div className="works-report-item">
            <div>
              <strong>Diagnosticar obras</strong>
              <span>Verifica capítulos sem métricas, links/IDs ausentes e obras que precisam de atenção.</span>
            </div>
            <button type="button" className="button-secondary" onClick={executarDiagnostico} disabled={carregando || !obras.length}>
              Diagnosticar
            </button>
          </div>

          <div className="works-report-item">
            <div>
              <strong>Atualizar dados das obras</strong>
              <span>Atualiza título, autor, capa, descrição e link conforme o Wattpad.</span>
            </div>
            <button type="button" className="button-secondary" onClick={executarAtualizacaoObras} disabled={carregando || !obras.length}>
              Atualizar obras
            </button>
          </div>

          <div className="works-report-item">
            <div>
              <strong>Atualizar dados dos capítulos</strong>
              <span>Busca palavras, parágrafos, comentários e tempo de leitura dos capítulos já cadastrados.</span>
            </div>
            <button type="button" className="button-secondary" onClick={executarAtualizacaoCapitulos} disabled={carregando || !obras.length}>
              Atualizar capítulos
            </button>
          </div>

          <div className="works-report-item">
            <div>
              <strong>Buscar novos capítulos</strong>
              <span>Consulta o Wattpad e cadastra somente os capítulos que ainda não estão na obra.</span>
            </div>
            <button type="button" className="button-primary" onClick={executarBuscaNovosCapitulos} disabled={carregando || !obras.length}>
              Buscar novos capítulos
            </button>
          </div>
        </div>
      </div>

      {falhasDetalhadas.length > 0 && (
        <div className="card">
          <div className="page-title-row">
            <div>
              <h3>Falhas encontradas</h3>
              <p>
                {falhasDetalhadas.length} falha(s) registrada(s) na última operação.
              </p>
            </div>
          </div>

          <div className="works-report">
            {falhasDetalhadas.map((falha, indice) => (
              <div
                className="works-report-item works-report-warning"
                key={`${falha.obra}-${falha.capitulo}-${indice}`}
              >
                <div>
                  <strong>{falha.obra}</strong>
                  <span>
                    {falha.capitulo
                      ? `${falha.etapa} • ${falha.capitulo}`
                      : falha.etapa}
                  </span>
                  <span>{falha.mensagem}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {relatorio.length > 0 && (
        <div className="card">
          <div className="page-title-row">
            <div>
              <h3>Obras que precisam de atenção</h3>
              <p>{relatorio.length} obra(s) encontrada(s) no último diagnóstico.</p>
            </div>
          </div>
          <div className="works-report">
            {relatorio.map((item) => (
              <div className="works-report-item works-report-warning" key={item.obra.id}>
                <div>
                  <strong>{item.obra.titulo}</strong>
                  <span>
                    {item.resumo.total} capítulo(s) • {item.resumo.semMetricas} sem palavras • {item.resumo.semLinkOuId} sem link/ID
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
