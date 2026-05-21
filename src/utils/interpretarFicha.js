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

function normalizar(valor = "") {
  return normalizarTexto(desestilizar(valor));
}

function removerPrefixoCampo(linha = "") {
  return limparValor(
    linha
      .replace(/^nome\s*[:：\-–—]?\s*/i, "")
      .replace(/^user\s*[:：\-–—]?\s*/i, "")
      .replace(/^adm\s*[:：\-–—]?\s*/i, "")
      .replace(/^grimo[óo]rio\s*\d+\s*[:：\-–—]?\s*/i, "")
      .replace(/^cap[íi]tulos?\s*lidos\s*[:：\-–—]?\s*/i, "")
      .replace(/^feedback\s*(proferido|oferecido)?\s*\??\s*[:：\-–—]?\s*/i, "")
      .replace(/^minha\s+obra\s*\??\s*[:：\-–—]?\s*/i, "")
  );
}

function encontrarLinha(linhas = [], regex) {
  return linhas.find((linha) => regex.test(linha)) || "";
}

function capturarSub(linhas = []) {
  const linhaSub = linhas.find((linha) => {
    const n = normalizar(linha);
    return n.includes("a 6") || n.includes("a-6") || n.includes("a6");
  });

  if (linhaSub) {
    return "A-6";
  }

  const linhaComCodigo = linhas.find((linha) => {
    const n = normalizar(linha);
    return /\ba\s*[- ]?\s*\d+\b/i.test(n);
  });

  if (!linhaComCodigo) {
    return "";
  }

  const match = normalizar(linhaComCodigo).match(/\ba\s*[- ]?\s*(\d+)\b/i);

  return match ? `A-${match[1]}` : "";
}

function capturarNome(linhas = []) {
  const linha = encontrarLinha(linhas, /^nome\s*[:：\-–—]/i);
  return removerPrefixoCampo(linha);
}

function capturarUser(linhas = [], textoOriginal = "") {
  const linha = encontrarLinha(linhas, /^user\s*[:：\-–—]/i);

  if (linha) {
    return removerPrefixoCampo(linha).replace(/^@/, "").trim();
  }

  const match = desestilizar(textoOriginal).match(/@([A-Za-z0-9_.-]+)/);

  return match?.[1] || "";
}

function capturarAdm(linhas = []) {
  const linha = encontrarLinha(linhas, /^adm\s*[:：\-–—]/i);
  return removerPrefixoCampo(linha);
}

function ehLinhaGrimorio(linha = "") {
  return /^grimo[óo]rio\s*\d+\s*[:：\-–—]/i.test(linha);
}

function ehLinhaCapitulos(linha = "") {
  return /^cap[íi]tulos?\s*lidos\s*[:：\-–—]?/i.test(linha);
}

function ehLinhaFeedback(linha = "") {
  return /^feedback\s*(proferido|oferecido)?\s*\??\s*[:：\-–—]?/i.test(linha);
}

function ehLinhaMinhaObra(linha = "") {
  return /^minha\s+obra\s*\??\s*[:：\-–—]?/i.test(linha);
}

function ehLinhaAdm(linha = "") {
  return /^adm\s*[:：\-–—]/i.test(linha);
}

function ehLinhaFinal(linha = "") {
  const n = normalizar(linha);

  return (
    n.includes("que marca essa leitura") ||
    n.includes("que cada leitura") ||
    n.includes("onde as obras") ||
    n.includes("trono profano")
  );
}

function limparCapitulo(capitulo = "") {
  return limparValor(capitulo)
    .replace(/^\d+[\).\-–—]\s*/, "")
    .replace(/^cap[íi]tulo\s*/i, "")
    .replace(/^cap\s*/i, "")
    .replace(/^parte\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function separarCapitulos(valor = "") {
  return String(valor || "")
    .split(/,|;|\||\/| e /gi)
    .map(limparCapitulo)
    .filter(Boolean);
}

function removerDuplicados(lista = []) {
  const vistos = new Set();

  return lista.filter((item) => {
    const chave = normalizar(item);

    if (!chave || vistos.has(chave)) {
      return false;
    }

    vistos.add(chave);
    return true;
  });
}

function valorIndicaTudo(valor = "") {
  const n = normalizar(valor);

  return (
    n.includes("li tudo") ||
    n.includes("ja li tudo") ||
    n.includes("já li tudo") ||
    n === "tudo" ||
    n.includes("tudo")
  );
}

function valorIndicaSim(valor = "") {
  const n = normalizar(valor);

  return (
    n === "s" ||
    n === "sim" ||
    n.includes("sim") ||
    n.includes("yes") ||
    n.includes("minha") ||
    n.includes("propria") ||
    n.includes("própria")
  );
}

function extrairBlocosObras(linhas = []) {
  const blocos = [];

  let blocoAtual = null;
  let lendoCapitulos = false;

  for (const linha of linhas) {
    if (ehLinhaGrimorio(linha)) {
      if (blocoAtual) {
        blocos.push(blocoAtual);
      }

      blocoAtual = {
        obra: removerPrefixoCampo(linha),
        capitulos: [],
        tudoLido: false,
        feedbackOferecido: false,
        minhaObra: false
      };

      lendoCapitulos = false;
      continue;
    }

    if (!blocoAtual) {
      continue;
    }

    if (ehLinhaCapitulos(linha)) {
      const valor = removerPrefixoCampo(linha);

      lendoCapitulos = true;

      if (valorIndicaTudo(valor)) {
        blocoAtual.tudoLido = true;
        blocoAtual.capitulos.push("TUDO");
        continue;
      }

      blocoAtual.capitulos.push(...separarCapitulos(valor));
      continue;
    }

    if (ehLinhaFeedback(linha)) {
      const valor = removerPrefixoCampo(linha);
      const n = normalizar(valor);

      lendoCapitulos = false;

      blocoAtual.feedbackOferecido =
        n.includes("sim") ||
        n.includes("s") ||
        n.includes("proferido") ||
        n.includes("oferecido");

      continue;
    }

    if (ehLinhaMinhaObra(linha)) {
      const valor = removerPrefixoCampo(linha);

      blocoAtual.minhaObra = valorIndicaSim(valor);
      lendoCapitulos = false;

      continue;
    }

    if (ehLinhaAdm(linha) || ehLinhaFinal(linha) || ehLinhaGrimorio(linha)) {
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
      obra: limparValor(bloco.obra),
      capitulos: removerDuplicados(bloco.capitulos)
    }))
    .filter((bloco) => bloco.obra);
}

function detectarMinhaObraGlobal(linhas = []) {
  const linha = linhas.find((item) => ehLinhaMinhaObra(item));

  if (!linha) {
    return false;
  }

  return valorIndicaSim(removerPrefixoCampo(linha));
}

export function interpretarFicha(textoFicha = "") {
  const texto = desestilizar(textoFicha);
  const linhas = dividirLinhas(texto);

  const blocosObras = extrairBlocosObras(linhas);
  const primeiroBloco = blocosObras[0] || null;

  const sub = capturarSub(linhas);
  const nomeLeitor = capturarNome(linhas);
  const userLeitor = capturarUser(linhas, texto);
  const adm = capturarAdm(linhas);

  const minhaObraGlobal = detectarMinhaObraGlobal(linhas);

  const obraLida = primeiroBloco?.obra || "";
  const capitulosInformados = primeiroBloco?.capitulos || [];

  const feedbackOferecido = blocosObras.some(
    (bloco) => bloco.feedbackOferecido
  );

  const avisos = [];

  if (!sub) avisos.push("Sub não identificado automaticamente.");
  if (!nomeLeitor) avisos.push("Nome do leitor não identificado automaticamente.");
  if (!userLeitor) avisos.push("User do leitor não identificado automaticamente.");
  if (!adm) avisos.push("ADM não identificado automaticamente.");
  if (!obraLida) avisos.push("Obra lida não identificada automaticamente.");
  if (!capitulosInformados.length) avisos.push("Capítulos não identificados automaticamente.");

  if (blocosObras.some((bloco) => bloco.tudoLido)) {
    avisos.push(
      "Uma ou mais obras foram marcadas como lidas inteiras. O sistema vai conferir os dois últimos capítulos cadastrados dessas obras."
    );
  }

  return {
    textoOriginal: textoFicha,
    sub,
    nomeLeitor,
    userLeitor,
    adm,
    obraLida,
    capitulosInformados,
    minhaObra: minhaObraGlobal || blocosObras.some((bloco) => bloco.minhaObra),
    feedbackOferecido,
    blocosObras,
    avisos
  };
}