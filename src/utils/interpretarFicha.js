import { normalizarTexto } from "./normalizarTexto.js";

function desestilizar(texto = "") {
  return String(texto || "")
    .normalize("NFKC")
    .replace(/\uFE0F/g, "");
}

function limparTextoBase(texto = "") {
  return desestilizar(texto)
    .replace(/[^\p{L}\p{N}@._:：\-–—|/,;?!()[\]\s]/gu, " ")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dividirLinhas(texto = "") {
  return desestilizar(texto)
    .split(/\r?\n/)
    .map((linha) => limparTextoBase(linha))
    .filter(Boolean);
}

function n(texto = "") {
  return normalizarTexto(limparTextoBase(texto));
}

function limparValor(valor = "") {
  return String(valor || "")
    .replace(/^[\s:：\-–—|?]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pegarDepoisDosDoisPontos(linha = "") {
  const partes = linha.split(/[:：]/);
  if (partes.length <= 1) return "";
  partes.shift();
  return limparValor(partes.join(":"));
}

function linhaEhDecorativaOuFinal(linha = "") {
  const normalizada = n(linha);

  return (
    !normalizada ||
    normalizada === "," ||
    normalizada.includes("confirmacao de leitura") ||
    normalizada.includes("onde as historias") ||
    normalizada.includes("onde as obras") ||
    normalizada.includes("atravessam fronteiras") ||
    normalizada.includes("que cada leitura") ||
    normalizada.includes("que cada feedback") ||
    normalizada.includes("palavras encontrem") ||
    normalizada.includes("margens de mundos") ||
    normalizada.includes("proj lunar") ||
    normalizada.includes("projeto lunar") ||
    normalizada.includes("adicionar comentario") ||
    normalizada.includes("que palavras voce deixa") ||
    normalizada.includes("que marca essa leitura")
  );
}

function removerCampo(linha = "", campos = []) {
  let valor = limparTextoBase(linha);

  campos.forEach((campo) => {
    const campoLimpo = campo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    valor = valor.replace(
      new RegExp(`^.*?\\b${campoLimpo}\\b\\s*\\d*\\s*[:：\\-–—?]?\\s*`, "i"),
      ""
    );
  });

  return limparValor(valor);
}

function capturarCampo(linhas = [], campos = []) {
  for (const linha of linhas) {
    const normalizada = n(linha);

    const encontrou = campos.some((campo) => {
      const campoNormalizado = normalizarTexto(campo);
      return normalizada.includes(campoNormalizado);
    });

    if (!encontrou) continue;

    const valorPorDoisPontos = pegarDepoisDosDoisPontos(linha);
    if (valorPorDoisPontos) return valorPorDoisPontos;

    const valor = removerCampo(linha, campos);
    if (valor) return valor;
  }

  return "";
}

function capturarSub(linhas = []) {
  for (const linha of linhas) {
    const normalizada = n(linha);
    const match = normalizada.match(/\ba\s*[- ]?\s*0?(\d+)\b/);

    if (match) return `A-${Number(match[1])}`;
  }

  return "";
}

function capturarNome(linhas = []) {
  return capturarCampo(linhas, ["nome"]);
}

function capturarUser(linhas = [], textoOriginal = "") {
  const user = capturarCampo(linhas, ["user", "usuario", "usuário"]);

  if (user) return user.replace(/^@/, "").trim();

  const match = desestilizar(textoOriginal).match(/@([A-Za-z0-9_.-]+)/);
  return match?.[1] || "";
}

function capturarAdm(linhas = []) {
  return capturarCampo(linhas, ["adm"]);
}

function ehLinhaObra(linha = "") {
  if (linhaEhDecorativaOuFinal(linha)) return false;

  const normalizada = n(linha);

  return (
    /^obra\s*\d+\s*[:：\-–—]/i.test(normalizada) ||
    /^grimorio\s*\d+\s*[:：\-–—]/i.test(normalizada) ||
    /^grimonio\s*\d+\s*[:：\-–—]/i.test(normalizada) ||
    /^mundo\s*\d+\s*[:：\-–—]/i.test(normalizada) ||
    /^livro\s*\d+\s*[:：\-–—]/i.test(normalizada)
  );
}

function ehCapitulos(linha = "") {
  const normalizada = n(linha);

  return (
    normalizada.includes("capitulos lidos") ||
    normalizada.startsWith("capitulos") ||
    normalizada.startsWith("capitulo")
  );
}

function ehFeedback(linha = "") {
  return n(linha).startsWith("feedback");
}

function ehMinhaObra(linha = "") {
  const normalizada = n(linha);
  return normalizada.startsWith("minha obra") || normalizada.includes("obra propria");
}

function ehAdmOuFinal(linha = "") {
  const normalizada = n(linha);

  return (
    normalizada.includes("adm") ||
    linhaEhDecorativaOuFinal(linha)
  );
}

function removerCampoObra(linha = "") {
  const valorPorDoisPontos = pegarDepoisDosDoisPontos(linha);

  if (valorPorDoisPontos) return valorPorDoisPontos;

  return removerCampo(linha, [
    "obra",
    "grimorio",
    "grimório",
    "grimonio",
    "mundo",
    "livro"
  ]);
}

function removerCampoCapitulos(linha = "") {
  const valorPorDoisPontos = pegarDepoisDosDoisPontos(linha);

  if (valorPorDoisPontos) return valorPorDoisPontos;

  return removerCampo(linha, [
    "capitulos lidos",
    "capítulos lidos",
    "capitulos",
    "capítulos"
  ]);
}

function limparCapitulo(capitulo = "") {
  return limparValor(capitulo)
    .replace(/^\d+[\).\-–—]\s*/, "")
    .replace(/^capítulo\s*/i, "")
    .replace(/^capitulo\s*/i, "")
    .replace(/^cap\s*/i, "")
    .replace(/^parte\s*/i, "")
    .trim();
}

function separarCapitulos(valor = "") {
  const texto = limparValor(valor);
  if (!texto) return [];

  const capitulos = [];
  const matchesComNumero = [
    ...texto.matchAll(/(?:cap[íi]tulo|capitulo|cap)\s*(\d+)/gi)
  ];

  matchesComNumero.forEach((match) => capitulos.push(match[1]));

  const textoSemNumerados = texto.replace(
    /(?:cap[íi]tulo|capitulo|cap)\s*\d+/gi,
    ""
  );

  textoSemNumerados
    .split(/,|;|\||\/| e /gi)
    .map(limparCapitulo)
    .filter(Boolean)
    .forEach((item) => {
      if (!capitulos.includes(item)) capitulos.push(item);
    });

  return capitulos.filter(Boolean);
}

function valorIndicaTudo(valor = "") {
  const normalizada = n(valor);

  return (
    normalizada.includes("li tudo") ||
    normalizada.includes("ja li tudo") ||
    normalizada.includes("tudo")
  );
}

function valorIndicaMinhaObra(valor = "") {
  const normalizada = n(valor);

  return (
    normalizada.includes("minha obra") ||
    normalizada.includes("obra minha") ||
    normalizada.includes("propria")
  );
}

function valorIndicaSim(valor = "") {
  const normalizada = n(valor);

  return (
    normalizada === "x" ||
    normalizada === "s" ||
    normalizada === "sim" ||
    normalizada.includes("sim") ||
    normalizada.includes("x") ||
    normalizada.includes("propria") ||
    normalizada.includes("minha")
  );
}

function removerDuplicados(lista = []) {
  const vistos = new Set();

  return lista.filter((item) => {
    const chave = n(item);
    if (!chave || vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

function extrairBlocosObras(linhas = []) {
  const blocos = [];

  let blocoAtual = null;
  let lendoCapitulos = false;

  for (const linha of linhas) {
    if (linhaEhDecorativaOuFinal(linha)) {
      lendoCapitulos = false;
      continue;
    }

    if (ehLinhaObra(linha)) {
      const obra = removerCampoObra(linha);

      if (obra && !linhaEhDecorativaOuFinal(obra)) {
        if (blocoAtual) blocos.push(blocoAtual);

        blocoAtual = {
          obra,
          capitulos: [],
          tudoLido: false,
          feedbackOferecido: false,
          minhaObra: false
        };

        lendoCapitulos = false;
        continue;
      }
    }

    if (!blocoAtual) continue;

    if (ehCapitulos(linha)) {
      const valor = removerCampoCapitulos(linha);
      lendoCapitulos = true;

      if (valorIndicaMinhaObra(valor)) {
        blocoAtual.minhaObra = true;
        blocoAtual.capitulos.push("MINHA_OBRA");
        lendoCapitulos = false;
        continue;
      }

      if (valorIndicaTudo(valor)) {
        blocoAtual.tudoLido = true;
        blocoAtual.capitulos.push("TUDO");
        continue;
      }

      blocoAtual.capitulos.push(...separarCapitulos(valor));
      continue;
    }

    if (ehFeedback(linha)) {
      const valor = pegarDepoisDosDoisPontos(linha) || removerCampo(linha, ["feedback"]);

      blocoAtual.feedbackOferecido = valorIndicaSim(valor);
      lendoCapitulos = false;
      continue;
    }

    if (ehMinhaObra(linha)) {
      const valor =
        pegarDepoisDosDoisPontos(linha) ||
        removerCampo(linha, ["minha obra", "obra propria", "obra própria"]);

      blocoAtual.minhaObra = valorIndicaSim(valor);
      lendoCapitulos = false;
      continue;
    }

    if (ehAdmOuFinal(linha)) {
      lendoCapitulos = false;
      continue;
    }

    if (lendoCapitulos) {
      const capitulo = limparCapitulo(linha);

      if (valorIndicaMinhaObra(capitulo)) {
        blocoAtual.minhaObra = true;
        blocoAtual.capitulos.push("MINHA_OBRA");
        lendoCapitulos = false;
        continue;
      }

      if (capitulo && !linhaEhDecorativaOuFinal(capitulo)) {
        blocoAtual.capitulos.push(capitulo);
      }
    }
  }

  if (blocoAtual) blocos.push(blocoAtual);

  return blocos
    .map((bloco) => ({
      ...bloco,
      obra: limparValor(bloco.obra),
      capitulos: removerDuplicados(bloco.capitulos)
    }))
    .filter((bloco) => bloco.obra && !linhaEhDecorativaOuFinal(bloco.obra));
}

function detectarMinhaObraGlobal(linhas = []) {
  const linha = linhas.find((item) => ehMinhaObra(item));

  if (!linha) return false;

  const valor =
    pegarDepoisDosDoisPontos(linha) ||
    removerCampo(linha, ["minha obra", "obra propria", "obra própria"]);

  return valorIndicaSim(valor);
}

export function interpretarFicha(textoFicha = "") {
  const textoNormalizado = desestilizar(textoFicha);
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

  if (blocosObras.some((bloco) => bloco.minhaObra)) {
    avisos.push(
      "Uma ou mais obras foram marcadas como Minha Obra e serão aprovadas automaticamente."
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