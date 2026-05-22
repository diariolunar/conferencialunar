import { useEffect, useMemo, useState } from "react";

import { DIAS_SEMANA } from "../utils/diasSemana.js";
import { interpretarFicha } from "../utils/interpretarFicha.js";
import { normalizarTexto } from "../utils/normalizarTexto.js";
import { gerarResumoConferencia } from "../utils/gerarResumoConferencia.js";

import { listarObras } from "../services/obrasService.js";
import { listarSubs } from "../services/subsService.js";

import {
  encontrarCapituloPorTexto,
  listarCapitulosDaObra
} from "../services/capitulosService.js";

import { buscarRegrasPadrao } from "../services/regrasService.js";
import { verificarLeiturasPreparadas } from "../services/conferenciaService.js";
import { salvarConferenciaNoHistorico } from "../services/historicoService.js";

const TIPOS_CAPITULO = ["Normal", "Especial", "Poesia"];

function simplificarTextoBusca(texto = "") {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b0+(\d+)\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizarBusca(texto = "") {
  return simplificarTextoBusca(texto)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function distanciaLevenshtein(a = "", b = "") {
  const textoA = simplificarTextoBusca(a);
  const textoB = simplificarTextoBusca(b);

  if (textoA === textoB) return 0;
  if (!textoA) return textoB.length;
  if (!textoB) return textoA.length;

  const matriz = Array.from({ length: textoA.length + 1 }, (_, i) => [i]);

  for (let j = 1; j <= textoB.length; j += 1) {
    matriz[0][j] = j;
  }

  for (let i = 1; i <= textoA.length; i += 1) {
    for (let j = 1; j <= textoB.length; j += 1) {
      const custo = textoA[i - 1] === textoB[j - 1] ? 0 : 1;

      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + custo
      );
    }
  }

  return matriz[textoA.length][textoB.length];
}

function similaridadeAproximada(a = "", b = "") {
  const textoA = simplificarTextoBusca(a);
  const textoB = simplificarTextoBusca(b);

  if (!textoA || !textoB) return 0;
  if (textoA === textoB) return 1;

  const maior = Math.max(textoA.length, textoB.length);
  if (maior === 0) return 0;

  const distancia = distanciaLevenshtein(textoA, textoB);

  return Math.max(0, 1 - distancia / maior);
}

function calcularSimilaridadeTokens(textoA = "", textoB = "") {
  const a = simplificarTextoBusca(textoA);
  const b = simplificarTextoBusca(textoB);

  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const tokensA = new Set(tokenizarBusca(a));
  const tokensB = new Set(tokenizarBusca(b));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersecao = 0;

  tokensA.forEach((tokenA) => {
    if (tokensB.has(tokenA)) {
      intersecao += 1;
      return;
    }

    const parecido = [...tokensB].some(
      (tokenB) => similaridadeAproximada(tokenA, tokenB) >= 0.78
    );

    if (parecido) {
      intersecao += 1;
    }
  });

  const uniao = new Set([...tokensA, ...tokensB]).size;

  return intersecao / uniao;
}

function calcularSimilaridadeGeral(textoA = "", textoB = "") {
  return Math.max(
    calcularSimilaridadeTokens(textoA, textoB),
    similaridadeAproximada(textoA, textoB)
  );
}

function pontuarObra(obra, tituloBusca = "") {
  const tituloObra = obra.titulo || "";
  const busca = simplificarTextoBusca(tituloBusca);
  const titulo = simplificarTextoBusca(tituloObra);

  if (!busca || !titulo) return 0;
  if (busca === titulo) return 100;

  let pontos = 0;

  if (titulo.includes(busca) || busca.includes(titulo)) {
    pontos += 75;
  }

  pontos += calcularSimilaridadeGeral(tituloObra, tituloBusca) * 80;

  const tokensBusca = tokenizarBusca(tituloBusca);
  const tokensTitulo = tokenizarBusca(tituloObra);

  const tokensEncontrados = tokensBusca.filter((tokenBusca) =>
    tokensTitulo.some(
      (tokenTitulo) =>
        tokenTitulo.includes(tokenBusca) ||
        tokenBusca.includes(tokenTitulo) ||
        similaridadeAproximada(tokenBusca, tokenTitulo) >= 0.78
    )
  ).length;

  pontos += tokensEncontrados * 20;

  const autor = obra.autor || "";
  const userAutor = obra.userAutor || "";

  if (autor) {
    pontos += calcularSimilaridadeGeral(autor, tituloBusca) * 8;
  }

  if (userAutor) {
    pontos += calcularSimilaridadeGeral(userAutor, tituloBusca) * 8;
  }

  return pontos;
}

export default function Conferencia() {
  const [diaSemana, setDiaSemana] = useState("");
  const [textoFicha, setTextoFicha] = useState("");

  const [obras, setObras] = useState([]);
  const [subs, setSubs] = useState([]);
  const [regras, setRegras] = useState(null);

  const [plano, setPlano] = useState(null);
  const [resultadoVerificacao, setResultadoVerificacao] = useState([]);

  const [preparando, setPreparando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [salvandoHistorico, setSalvandoHistorico] = useState(false);

  const [mensagem, setMensagem] = useState("");

  const [fichaAberta, setFichaAberta] = useState(true);
  const [interpretacaoAberta, setInterpretacaoAberta] = useState(true);
  const [planoAberto, setPlanoAberto] = useState(true);

  const gruposDeLeitura = useMemo(() => {
    if (!plano?.leituras?.length) return [];

    const mapa = new Map();

    plano.leituras.forEach((leitura, index) => {
      const chave =
        leitura.obraId ||
        leitura.obraTitulo ||
        leitura.obraInformada ||
        `obra-sem-id-${index}`;

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave,
          obraId: leitura.obraId || "",
          obraTitulo:
            leitura.obraTitulo ||
            leitura.obraInformada ||
            "Obra não encontrada",
          minhaObra: Boolean(leitura.minhaObra),
          leituras: []
        });
      }

      mapa.get(chave).leituras.push({
        ...leitura,
        indexOriginal: index
      });
    });

    return Array.from(mapa.values());
  }, [plano]);

  async function carregarBase() {
    try {
      const [obrasEncontradas, subsEncontrados, regrasEncontradas] =
        await Promise.all([listarObras(), listarSubs(), buscarRegrasPadrao()]);

      setObras(obrasEncontradas);
      setSubs(subsEncontrados);
      setRegras(regrasEncontradas);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao carregar obras, subs e regras.");
    }
  }

  useEffect(() => {
    carregarBase();
  }, []);

  function limparCodigo(texto = "") {
    return normalizarTexto(texto)
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  function encontrarSubPorNome(nomeSub = "") {
    const nomeNormalizado = normalizarTexto(nomeSub);
    const codigoSub = limparCodigo(nomeSub);

    if (!nomeNormalizado && !codigoSub) return null;

    const exato = subs.find((sub) => {
      const subNormalizado = normalizarTexto(sub.nome);
      const codigoBanco = limparCodigo(sub.nome);

      return (
        subNormalizado === nomeNormalizado ||
        codigoBanco === codigoSub ||
        codigoBanco.startsWith(codigoSub)
      );
    });

    if (exato) return exato;

    return (
      subs.find((sub) => {
        const subNormalizado = normalizarTexto(sub.nome);
        const codigoBanco = limparCodigo(sub.nome);

        return (
          subNormalizado.includes(nomeNormalizado) ||
          nomeNormalizado.includes(subNormalizado) ||
          codigoBanco.includes(codigoSub) ||
          codigoSub.includes(codigoBanco)
        );
      }) || null
    );
  }

  function encontrarObraPorTitulo(titulo = "") {
    const tituloNormalizado = simplificarTextoBusca(titulo);

    if (!tituloNormalizado) return null;

    const candidatos = obras
      .map((obra) => ({
        obra,
        pontos: pontuarObra(obra, titulo)
      }))
      .sort((a, b) => b.pontos - a.pontos);

    const melhor = candidatos[0];

    if (!melhor) return null;

    if (melhor.pontos >= 35) {
      return melhor.obra;
    }

    return null;
  }

  function montarLeitura({
    textoFicha,
    obra,
    capitulo,
    minhaObra = false,
    obraInformada = ""
  }) {
    return {
      textoFicha,
      obraInformada,
      obraId: obra?.id || "",
      obraTitulo: obra?.titulo || obraInformada || "",
      capituloId: capitulo?.id || "",
      wattpadId: capitulo?.wattpadId || capitulo?.id || "",
      titulo: capitulo?.titulo || textoFicha || "",
      link: capitulo?.link || "",
      palavras: Number(capitulo?.palavras || 0),
      paragrafos: Number(capitulo?.paragrafos || 0),
      comentariosTotais: Number(capitulo?.comentariosTotais || 0),
      distribuicaoComentarios: capitulo?.distribuicaoComentarios || {
        inicio: 0,
        meio: 0,
        fim: 0,
        geral: 0
      },
      ordem: capitulo?.ordem || "",
      tipo: capitulo?.tipo || "Normal",
      encontrado: Boolean(capitulo),
      minhaObra
    };
  }

  async function prepararLeiturasDeBloco(bloco) {
    const obraEncontrada = encontrarObraPorTitulo(bloco.obra);

    if (!obraEncontrada) {
      return {
        obraEncontrada: null,
        capitulosDaObra: [],
        leituras: bloco.capitulos.map((capituloInformado) =>
          montarLeitura({
            textoFicha: capituloInformado,
            obra: null,
            capitulo: null,
            minhaObra: bloco.minhaObra,
            obraInformada: bloco.obra
          })
        )
      };
    }

    const capitulosDaObra = await listarCapitulosDaObra(obraEncontrada.id);

    if (bloco.tudoLido) {
      const ultimosDois = [...capitulosDaObra]
        .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
        .slice(-2);

      return {
        obraEncontrada,
        capitulosDaObra,
        leituras: ultimosDois.map((capitulo) =>
          montarLeitura({
            textoFicha: "Li tudo — conferindo últimos capítulos",
            obra: obraEncontrada,
            capitulo,
            minhaObra: bloco.minhaObra,
            obraInformada: bloco.obra
          })
        )
      };
    }

    if (bloco.minhaObra) {
      return {
        obraEncontrada,
        capitulosDaObra,
        leituras: [
          montarLeitura({
            textoFicha: "Minha Obra",
            obra: obraEncontrada,
            capitulo: capitulosDaObra[0] || null,
            minhaObra: true,
            obraInformada: bloco.obra
          })
        ]
      };
    }

    return {
      obraEncontrada,
      capitulosDaObra,
      leituras: bloco.capitulos.map((capituloInformado) => {
        const capituloEncontrado = encontrarCapituloPorTexto(
          capitulosDaObra,
          capituloInformado
        );

        return montarLeitura({
          textoFicha: capituloInformado,
          obra: obraEncontrada,
          capitulo: capituloEncontrado,
          minhaObra: bloco.minhaObra,
          obraInformada: bloco.obra
        });
      })
    };
  }

  async function prepararConferencia(evento) {
    evento.preventDefault();

    if (!diaSemana) {
      setMensagem("Selecione obrigatoriamente o dia da leitura.");
      return;
    }

    if (!textoFicha.trim()) {
      setMensagem("Cole a ficha antes de preparar a conferência.");
      return;
    }

    setPreparando(true);
    setMensagem("");
    setResultadoVerificacao([]);

    try {
      const ficha = interpretarFicha(textoFicha);
      const subEncontrado = encontrarSubPorNome(ficha.sub);

      const blocos = ficha.blocosObras?.length
        ? ficha.blocosObras
        : [
            {
              obra: ficha.obraLida,
              capitulos: ficha.capitulosInformados,
              tudoLido: false,
              minhaObra: ficha.minhaObra,
              feedbackOferecido: ficha.feedbackOferecido
            }
          ];

      const leiturasPreparadas = [];
      const capitulosPorObra = {};

      for (const bloco of blocos) {
        const preparado = await prepararLeiturasDeBloco({
          ...bloco,
          minhaObra: bloco.minhaObra || ficha.minhaObra
        });

        if (preparado.obraEncontrada) {
          capitulosPorObra[preparado.obraEncontrada.id] =
            preparado.capitulosDaObra;
        }

        leiturasPreparadas.push(...preparado.leituras);
      }

      setPlano({
        ficha,
        diaSemana,
        subSelecionado: subEncontrado?.nome || ficha.sub,
        subEncontrado: Boolean(subEncontrado),
        capitulosPorObra,
        leituras: leiturasPreparadas
      });

      setFichaAberta(false);
      setInterpretacaoAberta(true);
      setPlanoAberto(true);
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao preparar conferência.");
    } finally {
      setPreparando(false);
    }
  }

  async function alterarObraDaLeitura(index, obraId) {
    const obra = obras.find((item) => item.id === obraId) || null;

    if (!obra) return;

    const capitulos = await listarCapitulosDaObra(obra.id);

    setPlano((estadoAtual) => {
      const leituras = [...estadoAtual.leituras];

      leituras[index] = {
        ...leituras[index],
        obraId: obra.id,
        obraTitulo: obra.titulo,
        capituloId: "",
        wattpadId: "",
        titulo: leituras[index].textoFicha || "",
        link: "",
        palavras: 0,
        paragrafos: 0,
        comentariosTotais: 0,
        distribuicaoComentarios: {
          inicio: 0,
          meio: 0,
          fim: 0,
          geral: 0
        },
        ordem: "",
        encontrado: false
      };

      return {
        ...estadoAtual,
        capitulosPorObra: {
          ...estadoAtual.capitulosPorObra,
          [obra.id]: capitulos
        },
        leituras
      };
    });

    setResultadoVerificacao([]);
  }

  function alterarCapituloManual(index, capituloId) {
    setPlano((estadoAtual) => {
      const leituras = [...estadoAtual.leituras];
      const leitura = leituras[index];
      const capitulos = estadoAtual.capitulosPorObra?.[leitura.obraId] || [];
      const capitulo = capitulos.find((item) => item.id === capituloId);

      leituras[index] = {
        ...leitura,
        capituloId: capitulo?.id || "",
        wattpadId: capitulo?.wattpadId || capitulo?.id || "",
        titulo: capitulo?.titulo || leitura.titulo,
        link: capitulo?.link || "",
        palavras: Number(capitulo?.palavras || 0),
        paragrafos: Number(capitulo?.paragrafos || 0),
        comentariosTotais: Number(capitulo?.comentariosTotais || 0),
        distribuicaoComentarios: capitulo?.distribuicaoComentarios || {
          inicio: 0,
          meio: 0,
          fim: 0,
          geral: 0
        },
        ordem: capitulo?.ordem || "",
        tipo: capitulo?.tipo || leitura.tipo || "Normal",
        encontrado: Boolean(capitulo)
      };

      return {
        ...estadoAtual,
        leituras
      };
    });

    setResultadoVerificacao([]);
  }

  function alterarCampoLeitura(index, campo, valor) {
    setPlano((estadoAtual) => {
      const leituras = [...estadoAtual.leituras];

      leituras[index] = {
        ...leituras[index],
        [campo]:
          campo === "palavras" ||
          campo === "paragrafos" ||
          campo === "ordem" ||
          campo === "comentariosTotais"
            ? Number(valor || 0)
            : valor
      };

      return {
        ...estadoAtual,
        leituras
      };
    });

    setResultadoVerificacao([]);
  }

  function adicionarCapituloNaObra(grupo) {
    setPlano((estadoAtual) => {
      const leituras = [...estadoAtual.leituras];

      const indicesDaObra = leituras
        .map((leitura, index) => ({ leitura, index }))
        .filter((item) => {
          const chaveLeitura =
            item.leitura.obraId ||
            item.leitura.obraTitulo ||
            item.leitura.obraInformada;

          return chaveLeitura === grupo.chave;
        })
        .map((item) => item.index);

      const ultimoIndexDaObra =
        indicesDaObra.length > 0
          ? Math.max(...indicesDaObra)
          : leituras.length - 1;

      const novaLeitura = {
        textoFicha: "Adicionado manualmente",
        obraInformada: grupo.obraTitulo,
        obraId: grupo.obraId || "",
        obraTitulo: grupo.obraTitulo || "",
        capituloId: "",
        wattpadId: "",
        titulo: "",
        link: "",
        palavras: 0,
        paragrafos: 0,
        comentariosTotais: 0,
        distribuicaoComentarios: {
          inicio: 0,
          meio: 0,
          fim: 0,
          geral: 0
        },
        ordem: "",
        tipo: "Normal",
        encontrado: false,
        minhaObra: grupo.minhaObra || false
      };

      leituras.splice(ultimoIndexDaObra + 1, 0, novaLeitura);

      return {
        ...estadoAtual,
        leituras
      };
    });

    setResultadoVerificacao([]);
  }

  function removerLeitura(index) {
    setPlano((estadoAtual) => ({
      ...estadoAtual,
      leituras: estadoAtual.leituras.filter((_, itemIndex) => itemIndex !== index)
    }));

    setResultadoVerificacao([]);
  }

  async function iniciarVerificacao() {
    if (!plano) return;

    const leituraInvalida = plano.leituras.find(
      (leitura) => !leitura.minhaObra && (!leitura.titulo || !leitura.link)
    );

    if (leituraInvalida) {
      setMensagem(
        "Existe leitura sem título ou link do capítulo. Corrija antes de verificar."
      );
      return;
    }

    setVerificando(true);
    setMensagem("");

    try {
      const resultados = await verificarLeiturasPreparadas({
        leituras: plano.leituras,
        userLeitor: plano.ficha.userLeitor,
        regras
      });

      setResultadoVerificacao(resultados);
      setInterpretacaoAberta(false);
      setPlanoAberto(false);
      setMensagem("Verificação concluída.");
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao verificar leituras.");
    } finally {
      setVerificando(false);
    }
  }

  function aprovarManual(index) {
    const motivo = window.prompt("Informe o motivo da aprovação manual:");

    if (!motivo?.trim()) {
      setMensagem("A aprovação manual exige motivo obrigatório.");
      return;
    }

    setResultadoVerificacao((estadoAtual) => {
      const lista = [...estadoAtual];

      lista[index] = {
        ...lista[index],
        resultado: {
          ...lista[index].resultado,
          aprovado: true,
          aprovadoManualmente: true,
          motivoAprovacaoManual: motivo.trim()
        }
      };

      return lista;
    });
  }

  async function copiarResumo() {
    const resumo = gerarResumoConferencia({
      sub: plano.subSelecionado,
      diaSemana: plano.diaSemana,
      nomeLeitor: plano.ficha.nomeLeitor,
      userLeitor: plano.ficha.userLeitor,
      adm: plano.ficha.adm,
      obraTitulo:
        resultadoVerificacao.length > 1
          ? "Múltiplas obras"
          : resultadoVerificacao[0]?.obraTitulo || "",
      capitulos: resultadoVerificacao
    });

    try {
      await navigator.clipboard.writeText(resumo);
      setMensagem("Resumo copiado.");
    } catch {
      setMensagem("Não foi possível copiar o resumo.");
    }
  }

  async function salvarHistorico() {
    try {
      setSalvandoHistorico(true);

      const resumo = gerarResumoConferencia({
        sub: plano.subSelecionado,
        diaSemana: plano.diaSemana,
        nomeLeitor: plano.ficha.nomeLeitor,
        userLeitor: plano.ficha.userLeitor,
        adm: plano.ficha.adm,
        obraTitulo:
          resultadoVerificacao.length > 1
            ? "Múltiplas obras"
            : resultadoVerificacao[0]?.obraTitulo || "",
        capitulos: resultadoVerificacao
      });

      await salvarConferenciaNoHistorico({
        sub: plano.subSelecionado,
        diaSemana: plano.diaSemana,
        nomeLeitor: plano.ficha.nomeLeitor,
        userLeitor: plano.ficha.userLeitor,
        adm: plano.ficha.adm,
        minhaObra: plano.ficha.minhaObra,
        feedbackOferecido: plano.ficha.feedbackOferecido,
        obraId: resultadoVerificacao[0]?.obraId || "",
        obraTitulo:
          resultadoVerificacao.length > 1
            ? "Múltiplas obras"
            : resultadoVerificacao[0]?.obraTitulo || "",
        capitulos: resultadoVerificacao,
        textoFichaOriginal: plano.ficha.textoOriginal,
        resumo
      });

      window.location.reload();
    } catch (erro) {
      console.error(erro);
      setMensagem("Erro ao salvar conferência.");
    } finally {
      setSalvandoHistorico(false);
    }
  }

  return (
    <section className="page">
      <div className="page-title">
        <h2>Conferência</h2>
        <p>Cole a ficha, revise as leituras e faça a verificação automática.</p>
      </div>

      {mensagem && <div className="notice-card">{mensagem}</div>}

      <details className="step-card" open={fichaAberta}>
        <summary>
          <span>1. Ficha de leitura</span>
          <strong>{plano ? "Preparada" : "Pendente"}</strong>
        </summary>

        <div className="step-content">
          <form className="form-grid" onSubmit={prepararConferencia}>
            <label>
              Dia da leitura
              <select
                value={diaSemana}
                onChange={(evento) => setDiaSemana(evento.target.value)}
              >
                <option value="">Selecione o dia</option>

                {DIAS_SEMANA.map((dia) => (
                  <option key={dia} value={dia}>
                    {dia}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ficha preenchida
              <textarea
                rows="12"
                value={textoFicha}
                onChange={(evento) => setTextoFicha(evento.target.value)}
                placeholder="Cole aqui a ficha preenchida pelo membro..."
              />
            </label>

            <button type="submit" className="button-primary" disabled={preparando}>
              {preparando ? "Preparando..." : "Preparar conferência"}
            </button>
          </form>
        </div>
      </details>

      {plano && (
        <>
          <details className="step-card" open={interpretacaoAberta}>
            <summary>
              <span>2. Prévia da interpretação</span>
              <strong>{plano.subEncontrado ? "Sub encontrado" : "Revisar"}</strong>
            </summary>

            <div className="step-content">
              <div className="interpretation-preview">
                <div>
                  <span>Sub interpretado</span>
                  <strong>{plano.ficha.sub || "Não identificado"}</strong>
                </div>

                <div>
                  <span>Sub no banco</span>
                  <strong>{plano.subEncontrado ? plano.subSelecionado : "Não encontrado"}</strong>
                </div>

                <div>
                  <span>Leitor</span>
                  <strong>{plano.ficha.nomeLeitor || "Não identificado"}</strong>
                </div>

                <div>
                  <span>User</span>
                  <strong>{plano.ficha.userLeitor || "Não identificado"}</strong>
                </div>

                <div>
                  <span>ADM</span>
                  <strong>{plano.ficha.adm || "Não identificado"}</strong>
                </div>

                <div>
                  <span>Obras na ficha</span>
                  <strong>{plano.ficha.blocosObras?.length || 0}</strong>
                </div>

                <div>
                  <span>Leituras preparadas</span>
                  <strong>{plano.leituras.length}</strong>
                </div>

                <div>
                  <span>Minha Obra</span>
                  <strong>{plano.ficha.minhaObra ? "Sim" : "Não"}</strong>
                </div>

                <div>
                  <span>Feedback oferecido</span>
                  <strong>{plano.ficha.feedbackOferecido ? "Sim" : "Não"}</strong>
                </div>
              </div>

              {plano.ficha.blocosObras?.length > 0 && (
                <div className="interpreted-chapters-box">
                  <h4>Obras interpretadas</h4>

                  <ul>
                    {plano.ficha.blocosObras.map((bloco, index) => (
                      <li key={`${bloco.obra}-${index}`}>
                        <strong>{bloco.obra}</strong> —{" "}
                        {bloco.tudoLido
                          ? "lida inteira, conferindo últimos 2 capítulos"
                          : bloco.minhaObra
                            ? "Minha Obra"
                            : `${bloco.capitulos.length} capítulo(s) informado(s)`}
                        {bloco.minhaObra ? " — aprovado automaticamente" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plano.ficha.avisos.length > 0 && (
                <div className="warning-list">
                  {plano.ficha.avisos.map((aviso) => (
                    <p key={aviso}>⚠️ {aviso}</p>
                  ))}
                </div>
              )}
            </div>
          </details>

          <details className="step-card" open={planoAberto}>
            <summary>
              <span>3. Plano de conferência</span>
              <strong>{plano.leituras.length} leitura(s)</strong>
            </summary>

            <div className="step-content">
              <div className="conference-work-list">
                {gruposDeLeitura.map((grupo, grupoIndex) => (
                  <div className="conference-work-card" key={grupo.chave}>
                    <div className="conference-work-header">
                      <div>
                        <span>Obra {grupoIndex + 1}</span>
                        <strong>{grupo.obraTitulo}</strong>
                      </div>

                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => adicionarCapituloNaObra(grupo)}
                      >
                        Adicionar capítulo nesta obra
                      </button>
                    </div>

                    <div className="conference-list">
                      {grupo.leituras.map((leitura) => {
                        const index = leitura.indexOriginal;
                        const capitulosDaObra =
                          plano.capitulosPorObra?.[leitura.obraId] || [];

                        return (
                          <div
                            className="conference-item"
                            key={`${index}-${leitura.textoFicha}`}
                          >
                            <div className="conference-item-header">
                              <div>
                                <span>Informado na ficha</span>
                                <strong>{leitura.textoFicha}</strong>
                              </div>

                              <button
                                type="button"
                                className="button-danger"
                                onClick={() => removerLeitura(index)}
                              >
                                Remover
                              </button>
                            </div>

                            <div className="form-row-2">
                              <label>
                                Obra cadastrada
                                <select
                                  value={leitura.obraId}
                                  onChange={(evento) =>
                                    alterarObraDaLeitura(index, evento.target.value)
                                  }
                                >
                                  <option value="">Selecione uma obra</option>

                                  {obras.map((obra) => (
                                    <option key={obra.id} value={obra.id}>
                                      {obra.titulo}
                                      {obra.autor ? ` — ${obra.autor}` : ""}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                Capítulo cadastrado
                                <select
                                  value={leitura.capituloId}
                                  onChange={(evento) =>
                                    alterarCapituloManual(index, evento.target.value)
                                  }
                                >
                                  <option value="">Selecione o capítulo</option>

                                  {capitulosDaObra.map((capitulo) => (
                                    <option key={capitulo.id} value={capitulo.id}>
                                      {capitulo.titulo}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <div className="form-row-2">
                              <label>
                                Tipo
                                <select
                                  value={leitura.tipo}
                                  onChange={(evento) =>
                                    alterarCampoLeitura(index, "tipo", evento.target.value)
                                  }
                                >
                                  {TIPOS_CAPITULO.map((tipo) => (
                                    <option key={tipo} value={tipo}>
                                      {tipo}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                Minha Obra
                                <select
                                  value={leitura.minhaObra ? "sim" : "nao"}
                                  onChange={(evento) =>
                                    alterarCampoLeitura(
                                      index,
                                      "minhaObra",
                                      evento.target.value === "sim"
                                    )
                                  }
                                >
                                  <option value="nao">Não</option>
                                  <option value="sim">Sim</option>
                                </select>
                              </label>
                            </div>

                            <div className="form-row-3">
                              <label>
                                Título exibido
                                <input
                                  type="text"
                                  value={leitura.titulo}
                                  onChange={(evento) =>
                                    alterarCampoLeitura(index, "titulo", evento.target.value)
                                  }
                                />
                              </label>

                              <label>
                                Palavras
                                <input
                                  type="number"
                                  min="0"
                                  value={leitura.palavras}
                                  onChange={(evento) =>
                                    alterarCampoLeitura(index, "palavras", evento.target.value)
                                  }
                                />
                              </label>

                              <label>
                                Parágrafos
                                <input
                                  type="number"
                                  min="0"
                                  value={leitura.paragrafos}
                                  onChange={(evento) =>
                                    alterarCampoLeitura(index, "paragrafos", evento.target.value)
                                  }
                                />
                              </label>
                            </div>

                            <label>
                              Link do capítulo
                              <input
                                type="url"
                                value={leitura.link}
                                onChange={(evento) =>
                                  alterarCampoLeitura(index, "link", evento.target.value)
                                }
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="actions-row">
                <button
                  type="button"
                  className="button-primary"
                  onClick={iniciarVerificacao}
                  disabled={verificando}
                >
                  {verificando ? "Verificando..." : "Iniciar verificação"}
                </button>
              </div>
            </div>
          </details>
        </>
      )}

      {resultadoVerificacao.length > 0 && (
        <div className="card">
          <h3>Resultado da verificação</h3>

          <div className="conference-list">
            {resultadoVerificacao.map((resultado, index) => (
              <div
                key={`${resultado.capituloId}-${index}`}
                className={`conference-item ${
                  resultado.resultado.aprovado
                    ? "result-approved"
                    : "result-rejected"
                }`}
              >
                <div className="conference-item-header">
                  <div>
                    <span>{resultado.obraTitulo || "Obra"}</span>
                    <strong>{resultado.titulo}</strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {resultado.resultado.aprovado ? "Aprovado" : "Reprovado"}
                    </strong>
                  </div>
                </div>

                {resultado.resultado.observacao && (
                  <div className="notice-card">
                    {resultado.resultado.observacao}
                  </div>
                )}

                <div className="chapter-meta-grid">
                  <div>
                    <span>Comentários</span>
                    <strong>{resultado.resultado.estatisticas.comentarios}</strong>
                  </div>

                  <div>
                    <span>Mínimo</span>
                    <strong>{resultado.resultado.estatisticas.minimoNecessario}</strong>
                  </div>

                  <div>
                    <span>Distribuição</span>
                    <strong>
                      I: {resultado.resultado.estatisticas.distribuicao?.inicio || 0} / M:{" "}
                      {resultado.resultado.estatisticas.distribuicao?.meio || 0} / F:{" "}
                      {resultado.resultado.estatisticas.distribuicao?.fim || 0} / G:{" "}
                      {resultado.resultado.estatisticas.distribuicao?.geral || 0}
                    </strong>
                  </div>

                  <div>
                    <span>Tempo</span>
                    <strong>
                      {resultado.resultado.estatisticas.tempoReal}min /{" "}
                      {resultado.resultado.estatisticas.tempoEstimado}min
                    </strong>
                  </div>
                </div>

                {resultado.resultado.motivos.length > 0 && (
                  <div className="warning-list">
                    {resultado.resultado.motivos.map((motivo) => (
                      <p key={motivo}>❌ {motivo}</p>
                    ))}
                  </div>
                )}

                {resultado.resultado.aprovadoManualmente && (
                  <div className="notice-card">
                    Aprovação manual: {resultado.resultado.motivoAprovacaoManual}
                  </div>
                )}

                {resultado.resultado.comentarios.length > 0 && (
                  <details className="comments-details">
                    <summary>Ver comentários encontrados</summary>

                    <div className="comments-list">
                      {resultado.resultado.comentarios.map((comentario) => (
                        <div className="comment-card" key={comentario.id}>
                          <strong>{comentario.posicao}</strong>
                          <p>{comentario.texto}</p>

                          {comentario.link && (
                            <a href={comentario.link} target="_blank" rel="noreferrer">
                              Abrir comentário
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {!resultado.resultado.aprovado && (
                  <div className="actions-row">
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => aprovarManual(index)}
                    >
                      Aprovar manualmente
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="actions-row">
            <button type="button" className="button-secondary" onClick={copiarResumo}>
              Copiar resumo
            </button>

            <button
              type="button"
              className="button-primary"
              onClick={salvarHistorico}
              disabled={salvandoHistorico}
            >
              {salvandoHistorico ? "Salvando..." : "Salvar no histórico"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}