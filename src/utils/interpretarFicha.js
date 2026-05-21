import { normalizarTexto } from "./normalizarTexto.js";

function limparTextoBase(texto = "") {
  return String(texto || "")
    .normalize("NFKC")
    .replace(/\uFE0F/g, "")
    .replace(/[𖤐⛓🔥♜📕📚💬🕯♛━]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dividirLinhas(texto = "") {
  return String(texto || "")
    .normalize("NFKC")
    .replace(/\uFE0F/g, "")
    .split(/\r?\n/)
    .map((linha) => limparTextoBase(linha))
    .filter(Boolean);
}

function limparValor(valor = "") {
  return String(valor || "")
    .replace(/^[\s:：\-–—|?]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function n(texto = "") {
  return normalizarTexto(limparTextoBase(texto));
}

function pegarDepoisDosDoisPontos(linha = "") {
  const partes = linha.split(/[:：]/);

  if (partes.length <= 1) {
    return "";
  }

  partes.shift();

  return limparValor(partes.join(":"));
}

function removerCampo(linha = "") {
  return limparValor(
    linha
      .replace(/^nome\s*[:：\-–—]?\s*/i, "")
      .replace(/^user\s*[:：\-–—]?\s*/i, "")
      .replace(/^adm\s*[:：\-–—]?\s*/i, "")
      .replace(/^grimo.?rio\s*\d+\s*[:：\-–—]?\s*/i, "")
      .replace(/^cap.?tulos?\s*lidos\s*[:：\-–—]?\s*/i, "")
      .replace(/^feedback\s*(proferido|oferecido)?\s*\??\s*[:：\-–—]?\s*/i, "")
      .replace(/^minha\s+obra\s*\??\s*[:：\-–—]?\s*/i, "")
  );
}

function capturarSub(linhas = []) {
  for (const linha of linhas) {
    const normalizada = n(linha);

    const match = normalizada.match(/\ba\s*[- ]?\s*(\d+)\b/);

    if (match) {
      return `A-${match[1]}`;
    }
  }

  return "";
}

function capturarNome(linhas = []) {
  const linha = linhas.find((item) => n(item).startsWith("nome"));
  return linha ? removerCampo(linha) : "";
}

function capturarUser(linhas = [], textoOriginal = "") {
  const linha = linhas.find((item) => n(item).startsWith("user"));

  if (linha) {
    return removerCampo(linha).replace(/^@/, "").trim();
  }

  const match = String(textoOriginal).normalize("NFKC").match(/@([A-Za-z0-9_.-]+)/);

  return match?.[1] || "";
}

function capturarAdm(linhas = []) {
  const linha = linhas.find((item) => n(item).startsWith("adm"));
  return linha ? removerCampo(linha) : "";
}

function ehGrimorio(linha = "") {
  const normalizada = n(linha);
  return normalizada.startsWith("grimorio") || normalizada.startsWith("grimonio");
}

function ehCapitulos(linha = "") {
  const normalizada = n(linha);
  return normalizada.startsWith("capitulos lidos") || normalizada.startsWith("capitulo lido");
}

function ehFeedback(linha = "") {
  return n(linha).startsWith("feedback");
}

function ehMinhaObra(linha = "") {
  return n(linha).startsWith("minha obra");
}

function ehAdmOuFinal(linha = "") {
  const normalizada = n(linha);

  return (
    normalizada.startsWith("adm") ||
    normalizada.includes("que marca essa leitura") ||
    normalizada.includes("que cada leitura") ||
    normalizada.includes("obras dignas") ||
    normalizada.includes("trono profano")
  );
}

function limparCapitulo(capitulo = "") {
  return limparValor(capitulo)
    .replace(/^\d+[\).\-–—]\s*/, "")
    .replace(/^capitulo\s*/i, "")
    .replace(/^cap\s*/i, "")
    .replace(/^parte\s*/i, "")
    .trim();
}

function separarCapitulos(valor = "") {
  return String(valor || "")
    .split(/,|;|\||\/| e /gi)
    .map(limparCapitulo)
    .filter(Boolean);
}

function valorIndicaTudo(valor = "") {
  const normalizada = n(valor);

  return (
    normalizada.includes("li tudo") ||
    normalizada.includes("ja li tudo") ||
    normalizada.includes("tudo")
  );
}

function valorIndicaSim(valor = "") {
  const normalizada = n(valor);

  return (
    normalizada === "s" ||
    normalizada === "sim" ||
    normalizada.includes("sim") ||
    normalizada.includes("propria") ||
    normalizada.includes("minha")
  );
}

function removerDuplicados(lista = []) {
  const vistos = new Set();

  return lista.filter((item) => {
    const chave = n(item);

    if (!chave || vistos.has(chave)) {
      return false;
    }

    vistos.add(chave);
    return true;
  });
}

function extrairBlocosObras(linhas = []) {
  const blocos = [];

  let blocoAtual = null;
  let lendoCapitulos = false;

  for (const linha of linhas) {
    if (ehGrimorio(linha)) {
      if (blocoAtual) {
        blocos.push(blocoAtual);
      }

      blocoAtual = {
        obra: removerCampo(linha) || pegarDepoisDosDoisPontos(linha),
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

    if (ehCapitulos(linha)) {
      const valor = removerCampo(linha) || pegarDepoisDosDoisPontos(linha);

      lendoCapitulos = true;

      if (valorIndicaTudo(valor)) {
        blocoAtual.tudoLido = true;
        blocoAtual.capitulos.push("TUDO");
        continue;
      }

      blocoAtual.capitulos.push(...separarCapitulos(valor));
      continue;
    }

    if (ehFeedback(linha)) {
      const valor = removerCampo(linha) || pegarDepoisDosDoisPontos(linha);

      blocoAtual.feedbackOferecido = valorIndicaSim(valor);
      lendoCapitulos = false;
      continue;
    }

    if (ehMinhaObra(linha)) {
      const valor = removerCampo(linha) || pegarDepoisDosDoisPontos(linha);

      blocoAtual.minhaObra = valorIndicaSim(valor);
      lendoCapitulos = false;
      continue;
    }

    if (ehGrimorio(linha) || ehAdmOuFinal(linha)) {
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
  const linha = linhas.find((item) => ehMinhaObra(item));

  if (!linha) {
    return false;
  }

  return valorIndicaSim(removerCampo(linha) || pegarDepoisDosDoisPontos(linha));
}

export function interpretarFicha(textoFicha = "") {
  const textoNormalizado = String(textoFicha || "").normalize("NFKC");
  const linhas = dividirLinhas(textoNormalizado);

  const blocosObras = extrairBlocosObras(linhas);
  const primeiroBloco = blocosObras[0] || null;

  const sub = capturarSub(linhas);
  const nomeLeitor = capturarNome(linhas);
  const userLeitor = capturarUser(linhas, textoNormalizado);
  const adm = capturarAdm(linhas);

  const minhaObraGlobal = detectarMinhaObraGlobal(linhas);

  const obraLida = primeiroBloco?.obra || "";
  const capitulosInformados = primeiroBloco?.capitulos || [];

  const feedbackOferecido = blocosObras.some((bloco) => bloco.feedbackOferecido);

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
    blocosObras: blocosObras.map((bloco) => ({
      ...bloco,
      minhaObra: minhaObraGlobal || bloco.minhaObra
    })),
    avisos
  };
}