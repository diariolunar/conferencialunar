import { normalizarTexto } from "./normalizarTexto.js";

function limparValor(valor = "") {
  return String(valor || "")
    .replace(/^[\s:：\-–—|]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removerEmojisBasicos(texto = "") {
  return String(texto || "")
    .replace(/[^\p{L}\p{N}\s@._:：\-–—|/.,;()[\]]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dividirLinhas(texto = "") {
  return String(texto || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
}

function linhaNormalizada(linha = "") {
  return normalizarTexto(removerEmojisBasicos(linha));
}

function capturarCampo(texto, nomesCampo = []) {
  const linhas = dividirLinhas(texto);

  for (const linha of linhas) {
    const linhaLimpa = removerEmojisBasicos(linha);
    const normalizada = linhaNormalizada(linhaLimpa);

    for (const campo of nomesCampo) {
      const campoNormalizado = normalizarTexto(campo);

      if (
        normalizada.startsWith(`${campoNormalizado}:`) ||
        normalizada.startsWith(`${campoNormalizado} -`) ||
        normalizada.startsWith(`${campoNormalizado} –`) ||
        normalizada.startsWith(`${campoNormalizado} —`) ||
        normalizada.startsWith(`${campoNormalizado} |`)
      ) {
        const regex = new RegExp(
          `^\\s*${campo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:：\\-–—|]\\s*(.+)$`,
          "i"
        );

        const match = linhaLimpa.match(regex);

        if (match?.[1]) {
          return limparValor(match[1]);
        }

        const partes = linhaLimpa.split(/[:：\-–—|]/);
        partes.shift();

        return limparValor(partes.join(" "));
      }
    }
  }

  return "";
}

function capturarUser(texto = "") {
  const direto = capturarCampo(texto, [
    "user",
    "usuário",
    "usuario",
    "user do leitor",
    "perfil",
    "wattpad",
    "user wattpad",
    "arroba"
  ]);

  if (direto) {
    return direto.replace(/^@/, "").trim();
  }

  const matchArroba = texto.match(/@([A-Za-z0-9_.-]+)/);

  if (matchArroba?.[1]) {
    return matchArroba[1].trim();
  }

  return "";
}

function detectarSim(texto = "", nomesCampo = []) {
  const valor = capturarCampo(texto, nomesCampo);
  const normalizado = normalizarTexto(valor);

  return [
    "sim",
    "s",
    "yes",
    "oferecido",
    "ofereci",
    "aceito"
  ].some((palavra) => normalizado === palavra || normalizado.includes(palavra));
}

function separarItens(texto = "") {
  return String(texto || "")
    .split(/,|;|\||\/| e |\n/gi)
    .map((item) => limparValor(item))
    .filter(Boolean);
}

function extrairCapitulosDeLinha(linha = "") {
  const partes = linha.split(/[:：\-–—|]/);

  if (partes.length > 1) {
    partes.shift();
    return separarItens(partes.join(" "));
  }

  return [];
}

function extrairCapitulos(texto = "") {
  const linhas = dividirLinhas(texto);
  const capitulos = [];

  const indicesPossiveis = [];

  linhas.forEach((linha, index) => {
    const normalizada = linhaNormalizada(linha);

    const pareceCampoCapitulo =
      normalizada.includes("capitulo") ||
      normalizada.includes("capitulos") ||
      normalizada.includes("capítulo") ||
      normalizada.includes("capítulos") ||
      normalizada.includes("parte") ||
      normalizada.includes("partes") ||
      normalizada.includes("episodio") ||
      normalizada.includes("episódio");

    if (pareceCampoCapitulo) {
      indicesPossiveis.push(index);

      const extraidos = extrairCapitulosDeLinha(linha);
      capitulos.push(...extraidos);
    }
  });

  for (const index of indicesPossiveis) {
    const proximasLinhas = linhas.slice(index + 1, index + 8);

    for (const linha of proximasLinhas) {
      const normalizada = linhaNormalizada(linha);

      const pareceNovoCampo =
        normalizada.includes("feedback") ||
        normalizada.includes("minha obra") ||
        normalizada.startsWith("adm") ||
        normalizada.startsWith("sub") ||
        normalizada.startsWith("nome") ||
        normalizada.startsWith("user") ||
        normalizada.startsWith("obra") ||
        normalizada.startsWith("livro") ||
        normalizada.startsWith("historia") ||
        normalizada.startsWith("história");

      if (pareceNovoCampo) {
        break;
      }

      const linhaSemMarcador = linha
        .replace(/^[\s\-–—*•]+/, "")
        .replace(/^\d+[\).\-–—]\s*/, "")
        .trim();

      if (linhaSemMarcador.length >= 1) {
        capitulos.push(linhaSemMarcador);
      }
    }
  }

  const capitulosNumericos = [];

  const matchesFaixa = texto.matchAll(
    /cap[ií]tulos?\s*(?:lidos?)?\s*[:：\-–—]?\s*(\d+)\s*(?:a|até|-|–|—)\s*(\d+)/gi
  );

  for (const match of matchesFaixa) {
    const inicio = Number(match[1]);
    const fim = Number(match[2]);

    if (inicio > 0 && fim >= inicio && fim - inicio <= 100) {
      for (let numero = inicio; numero <= fim; numero += 1) {
        capitulosNumericos.push(String(numero));
      }
    }
  }

  const matchesCapituloNumero = texto.matchAll(
    /cap[ií]tulo\s*(\d+)/gi
  );

  for (const match of matchesCapituloNumero) {
    capitulosNumericos.push(String(match[1]));
  }

  const todos = [...capitulos, ...capitulosNumericos]
    .map((item) =>
      item
        .replace(/^cap[ií]tulo\s*/i, "")
        .replace(/^cap\s*/i, "")
        .trim()
    )
    .filter(Boolean);

  const vistos = new Set();

  return todos.filter((item) => {
    const chave = normalizarTexto(item);

    if (!chave || vistos.has(chave)) {
      return false;
    }

    vistos.add(chave);
    return true;
  });
}

function capturarObra(texto = "") {
  return capturarCampo(texto, [
    "obra",
    "obra lida",
    "livro",
    "historia",
    "história",
    "titulo",
    "título",
    "nome da obra",
    "nome do livro"
  ]);
}

export function interpretarFicha(textoFicha = "") {
  const sub = capturarCampo(textoFicha, [
    "sub",
    "sub de leitura",
    "sala",
    "grupo"
  ]);

  const nomeLeitor = capturarCampo(textoFicha, [
    "nome",
    "nome do leitor",
    "leitor",
    "membro",
    "participante"
  ]);

  const userLeitor = capturarUser(textoFicha);

  const adm = capturarCampo(textoFicha, [
    "adm",
    "admin",
    "administrador",
    "administradora",
    "responsável",
    "responsavel"
  ]);

  const obraLida = capturarObra(textoFicha);
  const capitulosInformados = extrairCapitulos(textoFicha);

  const minhaObra = detectarSim(textoFicha, [
    "minha obra",
    "é minha obra",
    "eh minha obra",
    "obra própria",
    "obra propria"
  ]);

  const feedbackOferecido = detectarSim(textoFicha, [
    "feedback",
    "feedback oferecido",
    "ofereceu feedback",
    "ofereci feedback"
  ]);

  const avisos = [];

  if (!sub) avisos.push("Sub não identificado automaticamente.");
  if (!nomeLeitor) avisos.push("Nome do leitor não identificado automaticamente.");
  if (!userLeitor) avisos.push("User do leitor não identificado automaticamente.");
  if (!obraLida) avisos.push("Obra lida não identificada automaticamente.");
  if (!capitulosInformados.length) avisos.push("Capítulos não identificados automaticamente.");

  return {
    textoOriginal: textoFicha,
    sub,
    nomeLeitor,
    userLeitor,
    adm,
    obraLida,
    capitulosInformados,
    minhaObra,
    feedbackOferecido,
    avisos
  };
}