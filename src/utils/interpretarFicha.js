import { normalizarTexto } from "./normalizarTexto.js";

function desestilizar(texto = "") {
  return String(texto || "")
    .normalize("NFKC")
    .replace(/\uFE0F/g, "");
}

function limparLinha(linha = "") {
  return desestilizar(linha)
    .replace(/[𖤐⛓🔥♜📕📚💬🕯♛━]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dividirLinhas(texto = "") {
  return desestilizar(texto)
    .split(/\r?\n/)
    .map(limparLinha)
    .filter(Boolean);
}

function limparValor(valor = "") {
  return String(valor || "")
    .replace(/^[\s:：\-–—|?]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizar(linha = "") {
  return normalizarTexto(limparLinha(linha));
}

function removerCampo(linha = "") {
  return limparValor(
    linha
      .replace(/^A-\d+\s*[—\-–]?\s*/i, "")
      .replace(/^nome\s*[:：\-–—]?\s*/i, "")
      .replace(/^user\s*[:：\-–—]?\s*/i, "")
      .replace(/^adm\s*[:：\-–—]?\s*/i, "")
      .replace(/^grimo[óo]rio\s*\d+\s*[:：\-–—]?\s*/i, "")
      .replace(/^cap[íi]tulos?\s*lidos\s*[:：\-–—]?\s*/i, "")
      .replace(/^feedback\s*(proferido|oferecido)?\s*\??\s*[:：\-–—]?\s*/i, "")
  );
}

function capturarLinhaPorInicio(linhas, inicios = []) {
  return (
    linhas.find((linha) => {
      const n = normalizar(linha);
      return inicios.some((inicio) => n.startsWith(normalizarTexto(inicio)));
    }) || ""
  );
}

function capturarSub(linhas) {
  const linhaSub = linhas.find((linha) => {
    const n = normalizar(linha);
    return /\ba\s*[- ]?\s*\d+\b/i.test(n);
  });

  if (!linhaSub) return "";

  const match = normalizar(linhaSub).match(/\ba\s*[- ]?\s*(\d+)\b/i);

  return match ? `A-${match[1]}` : "";
}

function capturarNome(linhas) {
  const linha = capturarLinhaPorInicio(linhas, ["nome"]);
  return removerCampo(linha);
}

function capturarUser(linhas, textoOriginal) {
  const linha = capturarLinhaPorInicio(linhas, ["user"]);

  if (linha) {
    return removerCampo(linha).replace(/^@/, "").trim();
  }

  const match = desestilizar(textoOriginal).match(/@([A-Za-z0-9_.-]+)/);
  return match?.[1] || "";
}

function capturarAdm(linhas) {
  const linha = capturarLinhaPorInicio(linhas, ["adm"]);
  return removerCampo(linha);
}

function ehLinhaObra(linha = "") {
  const n = normalizar(linha);
  return (
    n.startsWith("grimorio") ||
    n.startsWith("grimonio") ||
    n.startsWith("obra") ||
    n.startsWith("livro") ||
    n.startsWith("historia") ||
    n.startsWith("titulo")
  );
}

function ehLinhaCapitulos(linha = "") {
  const n = normalizar(linha);
  return n.startsWith("capitulos lidos") || n.startsWith("capitulo lido");
}

function ehLinhaFeedback(linha = "") {
  const n = normalizar(linha);
  return n.startsWith("feedback");
}

function ehLinhaAdm(linha = "") {
  return normalizar(linha).startsWith("adm");
}

function ehLinhaEncerramento(linha = "") {
  const n = normalizar(linha);

  return (
    n.includes("que marca essa leitura") ||
    n.includes("que cada leitura") ||
    n.includes("onde as obras")
  );
}

function limparCapitulo(texto = "") {
  return limparValor(texto)
    .replace(/^\d+[\).\-–—]\s*/, "")
    .replace(/^cap[íi]tulo\s*/i, "")
    .replace(/^cap\s*/i, "")
    .trim();
}

function separarCapitulos(valor = "") {
  return String(valor || "")
    .split(/,|;|\||\/| e /gi)
    .map(limparCapitulo)
    .filter(Boolean);
}

function extrairBlocosObras(linhas) {
  const blocos = [];
  let blocoAtual = null;
  let lendoCapitulos = false;

  for (const linha of linhas) {
    if (ehLinhaObra(linha)) {
      if (blocoAtual) {
        blocos.push(blocoAtual);
      }

      blocoAtual = {
        obra: removerCampo(linha),
        capitulos: [],
        tudoLido: false,
        feedbackOferecido: false
      };

      lendoCapitulos = false;
      continue;
    }

    if (!blocoAtual) continue;

    if (ehLinhaCapitulos(linha)) {
      lendoCapitulos = true;

      const valor = removerCampo(linha);
      const n = normalizar(valor);

      if (n.includes("li tudo") || n.includes("ja li tudo") || n.includes("tudo")) {
        blocoAtual.tudoLido = true;
        blocoAtual.capitulos.push("TUDO");
      } else {
        blocoAtual.capitulos.push(...separarCapitulos(valor));
      }

      continue;
    }

    if (ehLinhaFeedback(linha)) {
      lendoCapitulos = false;

      const valor = removerCampo(linha);
      const n = normalizar(valor);

      blocoAtual.feedbackOferecido =
        n.includes("sim") ||
        n.includes("s") ||
        n.includes("proferido") ||
        n.includes("oferecido");

      continue;
    }

    if (ehLinhaAdm(linha) || ehLinhaEncerramento(linha)) {
      lendoCapitulos = false;
      continue;
    }

    if (ehLinhaObra(linha)) {
      lendoCapitulos = false;
      continue;
    }

    if (lendoCapitulos) {
      const capitulo = limparCapitulo(linha);

      if (capitulo) {
        blocoAtual.capitulos.push(capitulo);
      }
    }
  }

  if (blocoAtual) {
    blocos.push(blocoAtual);
  }

  return blocos
    .map((bloco) => ({
      ...bloco,
      capitulos: removerDuplicados(bloco.capitulos)
    }))
    .filter((bloco) => bloco.obra);
}

function removerDuplicados(lista = []) {
  const vistos = new Set();

  return lista.filter((item) => {
    const chave = normalizarTexto(item);

    if (!chave || vistos.has(chave)) return false;

    vistos.add(chave);
    return true;
  });
}

export function interpretarFicha(textoFicha = "") {
  const textoLimpo = desestilizar(textoFicha);
  const linhas = dividirLinhas(textoLimpo);

  const blocosObras = extrairBlocosObras(linhas);
  const primeiroBloco = blocosObras[0] || null;

  const sub = capturarSub(linhas);
  const nomeLeitor = capturarNome(linhas);
  const userLeitor = capturarUser(linhas, textoLimpo);
  const adm = capturarAdm(linhas);

  const obraLida = primeiroBloco?.obra || "";
  const capitulosInformados = primeiroBloco?.capitulos || [];

  const feedbackOferecido = blocosObras.some(
    (bloco) => bloco.feedbackOferecido
  );

  const avisos = [];

  if (!sub) avisos.push("Sub não identificado automaticamente.");
  if (!nomeLeitor) avisos.push("Nome do leitor não identificado automaticamente.");
  if (!userLeitor) avisos.push("User do leitor não identificado automaticamente.");
  if (!obraLida) avisos.push("Obra lida não identificada automaticamente.");
  if (!capitulosInformados.length) avisos.push("Capítulos não identificados automaticamente.");

  if (blocosObras.length > 1) {
    avisos.push("A ficha possui mais de uma obra. Por enquanto o sistema preparou a primeira.");
  }

  if (primeiroBloco?.tudoLido) {
    avisos.push("A ficha informa que a obra foi lida inteira. Selecione manualmente os capítulos para conferir.");
  }

  return {
    textoOriginal: textoFicha,
    sub,
    nomeLeitor,
    userLeitor,
    adm,
    obraLida,
    capitulosInformados,
    minhaObra: false,
    feedbackOferecido,
    blocosObras,
    avisos
  };
}