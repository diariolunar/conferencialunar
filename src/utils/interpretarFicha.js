import { normalizarTexto } from "./normalizarTexto.js";

const CAMPOS_SUB = [
  "sub",
  "sub de leitura",
  "sala",
  "grupo"
];

const CAMPOS_NOME = [
  "nome",
  "nome do leitor",
  "leitor",
  "membro",
  "participante"
];

const CAMPOS_USER = [
  "user",
  "usuário",
  "usuario",
  "user do leitor",
  "perfil",
  "wattpad",
  "user wattpad",
  "arroba"
];

const CAMPOS_ADM = [
  "adm",
  "admin",
  "administrador",
  "administradora",
  "responsável",
  "responsavel"
];

const CAMPOS_OBRA = [
  "obra",
  "obra lida",
  "livro",
  "história",
  "historia",
  "título",
  "titulo",
  "nome da obra",
  "nome do livro"
];

function limparValor(valor = "") {
  return String(valor || "")
    .replace(/^[\s:：\-–—|]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removerEmojis(texto = "") {
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

function normalizarLinha(linha = "") {
  return normalizarTexto(removerEmojis(linha));
}

function campoBate(linhaNormalizada, campo) {
  const campoNormalizado = normalizarTexto(campo);

  return (
    linhaNormalizada.startsWith(`${campoNormalizado}:`) ||
    linhaNormalizada.startsWith(`${campoNormalizado} -`) ||
    linhaNormalizada.startsWith(`${campoNormalizado} –`) ||
    linhaNormalizada.startsWith(`${campoNormalizado} —`) ||
    linhaNormalizada.startsWith(`${campoNormalizado} |`)
  );
}

function capturarCampo(texto, campos = []) {
  const linhas = dividirLinhas(texto);

  for (const linha of linhas) {
    const linhaLimpa = removerEmojis(linha);
    const linhaNormalizada = normalizarLinha(linhaLimpa);

    for (const campo of campos) {
      if (!campoBate(linhaNormalizada, campo)) {
        continue;
      }

      const partes = linhaLimpa.split(/[:：\-–—|]/);
      partes.shift();

      const valor = limparValor(partes.join(" "));

      if (valor) {
        return valor;
      }
    }
  }

  return "";
}

function capturarUser(texto = "") {
  const direto = capturarCampo(texto, CAMPOS_USER);

  if (direto) {
    return direto.replace(/^@/, "").trim();
  }

  const matchArroba = texto.match(/@([A-Za-z0-9_.-]+)/);

  if (matchArroba?.[1]) {
    return matchArroba[1].trim();
  }

  return "";
}

function detectarSim(texto = "", campos = []) {
  const valor = capturarCampo(texto, campos);
  const normalizado = normalizarTexto(valor);

  return [
    "sim",
    "s",
    "yes",
    "oferecido",
    "ofereci",
    "aceito",
    "aceita"
  ].some((palavra) => normalizado === palavra || normalizado.includes(palavra));
}

function pareceNovoCampo(linha = "") {
  const normalizada = normalizarLinha(linha);

  const campos = [
    ...CAMPOS_SUB,
    ...CAMPOS_NOME,
    ...CAMPOS_USER,
    ...CAMPOS_ADM,
    ...CAMPOS_OBRA,
    "feedback",
    "feedback oferecido",
    "minha obra",
    "é minha obra",
    "eh minha obra",
    "obra própria",
    "obra propria"
  ];

  return campos.some((campo) => {
    const campoNormalizado = normalizarTexto(campo);

    return (
      normalizada.startsWith(`${campoNormalizado}:`) ||
      normalizada.startsWith(`${campoNormalizado} -`) ||
      normalizada.startsWith(`${campoNormalizado} –`) ||
      normalizada.startsWith(`${campoNormalizado} —`) ||
      normalizada.startsWith(`${campoNormalizado} |`)
    );
  });
}

function separarItens(texto = "") {
  return String(texto || "")
    .split(/,|;|\||\/| e |\n/gi)
    .map((item) => limparCapituloInformado(item))
    .filter(Boolean);
}

function limparCapituloInformado(texto = "") {
  return String(texto || "")
    .replace(/^[\s\-–—*•]+/, "")
    .replace(/^\d+[\).\-–—]\s*/, "")
    .replace(/^cap[íi]tulo\s*/i, "")
    .replace(/^cap\s*/i, "")
    .replace(/^parte\s*/i, "")
    .replace(/^epis[óo]dio\s*/i, "")
    .trim();
}

function extrairCapitulosDeLinha(linha = "") {
  const partes = linha.split(/[:：\-–—|]/);

  if (partes.length <= 1) {
    return [];
  }

  partes.shift();

  return separarItens(partes.join(" "));
}

function expandirFaixas(texto = "") {
  const capitulos = [];

  const matchesFaixa = texto.matchAll(
    /cap[íi]tulos?\s*(?:lidos?)?\s*[:：\-–—]?\s*(\d+)\s*(?:a|até|-|–|—)\s*(\d+)/gi
  );

  for (const match of matchesFaixa) {
    const inicio = Number(match[1]);
    const fim = Number(match[2]);

    if (inicio > 0 && fim >= inicio && fim - inicio <= 100) {
      for (let numero = inicio; numero <= fim; numero += 1) {
        capitulos.push(String(numero));
      }
    }
  }

  return capitulos;
}

function extrairCapitulosNumericos(texto = "") {
  const capitulos = [];

  const matchesCapituloNumero = texto.matchAll(
    /(?:cap[íi]tulo|cap|parte|epis[óo]dio)\s*(\d+)/gi
  );

  for (const match of matchesCapituloNumero) {
    capitulos.push(String(match[1]));
  }

  return capitulos;
}

function extrairCapitulos(texto = "") {
  const linhas = dividirLinhas(texto);
  const capitulos = [];

  linhas.forEach((linha, index) => {
    const normalizada = normalizarLinha(linha);

    const pareceCampoCapitulo =
      normalizada.includes("capitulo") ||
      normalizada.includes("capitulos") ||
      normalizada.includes("capítulo") ||
      normalizada.includes("capítulos") ||
      normalizada.includes("parte") ||
      normalizada.includes("partes") ||
      normalizada.includes("episodio") ||
      normalizada.includes("episódio");

    if (!pareceCampoCapitulo) {
      return;
    }

    capitulos.push(...extrairCapitulosDeLinha(linha));

    const proximasLinhas = linhas.slice(index + 1, index + 10);

    for (const proximaLinha of proximasLinhas) {
      if (pareceNovoCampo(proximaLinha)) {
        break;
      }

      const limpa = limparCapituloInformado(proximaLinha);

      if (limpa) {
        capitulos.push(limpa);
      }
    }
  });

  capitulos.push(...expandirFaixas(texto));
  capitulos.push(...extrairCapitulosNumericos(texto));

  const vistos = new Set();

  return capitulos
    .map((item) => limparCapituloInformado(item))
    .filter(Boolean)
    .filter((item) => {
      const chave = normalizarTexto(item);

      if (!chave || vistos.has(chave)) {
        return false;
      }

      vistos.add(chave);
      return true;
    });
}

export function interpretarFicha(textoFicha = "") {
  const sub = capturarCampo(textoFicha, CAMPOS_SUB);
  const nomeLeitor = capturarCampo(textoFicha, CAMPOS_NOME);
  const userLeitor = capturarUser(textoFicha);
  const adm = capturarCampo(textoFicha, CAMPOS_ADM);
  const obraLida = capturarCampo(textoFicha, CAMPOS_OBRA);

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
