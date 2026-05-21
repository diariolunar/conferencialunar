import { normalizarTexto } from "./normalizarTexto.js";

const CAMPOS_NOME = ["nome", "nome do leitor", "leitor", "membro", "participante"];
const CAMPOS_USER = ["user", "usuario", "usuário", "user do leitor", "perfil", "wattpad", "arroba"];
const CAMPOS_ADM = ["adm", "admin", "administrador", "administradora", "responsavel", "responsável"];
const CAMPOS_FEEDBACK = ["feedback", "feedback proferido", "feedback oferecido"];
const CAMPOS_CAPITULOS = ["capitulos lidos", "capítulos lidos", "capitulos", "capítulos"];
const CAMPOS_OBRA = ["obra", "obra lida", "livro", "historia", "história", "titulo", "título", "grimonio", "grimorio", "grimório"];

function converterLetrasEspeciais(texto = "") {
  const mapa = {
    "𝐀": "A", "𝐁": "B", "𝐂": "C", "𝐃": "D", "𝐄": "E", "𝐅": "F", "𝐆": "G", "𝐇": "H", "𝐈": "I", "𝐉": "J", "𝐊": "K", "𝐋": "L", "𝐌": "M",
    "𝐍": "N", "𝐎": "O", "𝐏": "P", "𝐐": "Q", "𝐑": "R", "𝐒": "S", "𝐓": "T", "𝐔": "U", "𝐕": "V", "𝐖": "W", "𝐗": "X", "𝐘": "Y", "𝐙": "Z",
    "𝐚": "a", "𝐛": "b", "𝐜": "c", "𝐝": "d", "𝐞": "e", "𝐟": "f", "𝐠": "g", "𝐡": "h", "𝐢": "i", "𝐣": "j", "𝐤": "k", "𝐥": "l", "𝐦": "m",
    "𝐧": "n", "𝐨": "o", "𝐩": "p", "𝐪": "q", "𝐫": "r", "𝐬": "s", "𝐭": "t", "𝐮": "u", "𝐯": "v", "𝐰": "w", "𝐱": "x", "𝐲": "y", "𝐳": "z",
    "𝟎": "0", "𝟏": "1", "𝟐": "2", "𝟑": "3", "𝟒": "4", "𝟓": "5", "𝟔": "6", "𝟕": "7", "𝟖": "8", "𝟗": "9"
  };

  return String(texto || "")
    .split("")
    .map((caractere) => mapa[caractere] || caractere)
    .join("");
}

function limparLinhaVisual(linha = "") {
  return converterLetrasEspeciais(linha)
    .replace(/[𖤐⛓️🔥♜📕📚💬🕯️♛━>]/g, " ")
    .replace(/[^\p{L}\p{N}\s@._:：\-–—|/.,;?!()[\]]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dividirLinhas(texto = "") {
  return String(texto || "")
    .split(/\r?\n/)
    .map((linha) => limparLinhaVisual(linha))
    .filter(Boolean);
}

function normalizar(linha = "") {
  return normalizarTexto(limparLinhaVisual(linha));
}

function limparValor(valor = "") {
  return String(valor || "")
    .replace(/^[\s:：\-–—|?]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function temCampo(linhaNormalizada = "", campos = []) {
  return campos.some((campo) => {
    const campoNormalizado = normalizarTexto(campo);

    return (
      linhaNormalizada.startsWith(`${campoNormalizado}:`) ||
      linhaNormalizada.startsWith(`${campoNormalizado} -`) ||
      linhaNormalizada.startsWith(`${campoNormalizado} –`) ||
      linhaNormalizada.startsWith(`${campoNormalizado} —`) ||
      linhaNormalizada.startsWith(`${campoNormalizado}?`) ||
      linhaNormalizada === campoNormalizado ||
      linhaNormalizada.includes(`${campoNormalizado}:`)
    );
  });
}

function removerNomeCampo(linha = "", campos = []) {
  let resultado = linha;

  campos.forEach((campo) => {
    const regex = new RegExp(`^\\s*${campo}\\s*\\d*\\s*[:：\\-–—?]?\\s*`, "i");
    resultado = resultado.replace(regex, "");
  });

  resultado = resultado.replace(/^grimo[óo]rio\s*\d+\s*[:：\-–—]?\s*/i, "");
  resultado = resultado.replace(/^cap[íi]tulos?\s*lidos\s*[:：\-–—]?\s*/i, "");
  resultado = resultado.replace(/^feedback\s*(proferido|oferecido)?\s*\??\s*[:：\-–—]?\s*/i, "");

  return limparValor(resultado);
}

function capturarCampo(texto = "", campos = []) {
  const linhas = dividirLinhas(texto);

  for (const linha of linhas) {
    const linhaNormalizada = normalizar(linha);

    if (!temCampo(linhaNormalizada, campos)) {
      continue;
    }

    const valor = removerNomeCampo(linha, campos);

    if (valor) {
      return valor;
    }
  }

  return "";
}

function capturarSub(texto = "") {
  const linhas = dividirLinhas(texto);

  for (const linha of linhas) {
    const normalizada = normalizar(linha);

    const matchCodigo = normalizada.match(/\ba\s*[- ]?\s*(\d+)\b/);

    if (matchCodigo) {
      if (
        normalizada.includes("trono") ||
        normalizada.includes("profano") ||
        normalizada.includes("a 6") ||
        normalizada.includes("a-6") ||
        normalizada.includes("a6")
      ) {
        return `A-${matchCodigo[1]}`;
      }
    }
  }

  return capturarCampo(texto, ["sub", "sub de leitura", "sala", "grupo"]);
}

function capturarUser(texto = "") {
  const direto = capturarCampo(texto, CAMPOS_USER);

  if (direto) {
    return direto.replace(/^@/, "").trim();
  }

  const matchArroba = converterLetrasEspeciais(texto).match(/@([A-Za-z0-9_.-]+)/);

  if (matchArroba?.[1]) {
    return matchArroba[1].trim();
  }

  return "";
}

function linhaEhNovoBloco(linha = "") {
  const n = normalizar(linha);

  return (
    temCampo(n, CAMPOS_OBRA) ||
    temCampo(n, CAMPOS_ADM) ||
    n.includes("que marca essa leitura") ||
    n.includes("que cada leitura") ||
    n.includes("onde as obras")
  );
}

function linhaEhCampoCapitulos(linha = "") {
  return temCampo(normalizar(linha), CAMPOS_CAPITULOS);
}

function linhaEhCampoFeedback(linha = "") {
  return temCampo(normalizar(linha), CAMPOS_FEEDBACK);
}

function linhaEhObra(linha = "") {
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

function limparCapituloInformado(texto = "") {
  return converterLetrasEspeciais(texto)
    .replace(/^[\s\-–—*•]+/, "")
    .replace(/^\d+[\).\-–—]\s*/, "")
    .replace(/^cap[íi]tulo\s*/i, "")
    .replace(/^cap\s*/i, "")
    .replace(/^parte\s*/i, "")
    .replace(/^epis[óo]dio\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function separarCapitulosDaLinha(texto = "") {
  return String(texto || "")
    .split(/,|;|\||\/| e /gi)
    .map((item) => limparCapituloInformado(item))
    .filter(Boolean);
}

function detectarFeedbackNoBloco(linhas = []) {
  const linhaFeedback = linhas.find((linha) => linhaEhCampoFeedback(linha));

  if (!linhaFeedback) {
    return false;
  }

  const valor = removerNomeCampo(linhaFeedback, CAMPOS_FEEDBACK);
  const n = normalizar(valor);

  return n.includes("sim") || n.includes("s") || n.includes("oferecido") || n.includes("proferido");
}

function extrairBlocosDeObras(texto = "") {
  const linhas = dividirLinhas(texto);
  const blocos = [];
  let blocoAtual = null;

  for (let index = 0; index < linhas.length; index += 1) {
    const linha = linhas[index];

    if (linhaEhObra(linha)) {
      if (blocoAtual) {
        blocos.push(blocoAtual);
      }

      blocoAtual = {
        obra: removerNomeCampo(linha, CAMPOS_OBRA),
        capitulos: [],
        feedbackOferecido: false,
        tudoLido: false,
        linhas: [linha]
      };

      continue;
    }

    if (!blocoAtual) {
      continue;
    }

    blocoAtual.linhas.push(linha);

    if (linhaEhCampoCapitulos(linha)) {
      const valorCapitulos = removerNomeCampo(linha, CAMPOS_CAPITULOS);
      const n = normalizar(valorCapitulos);

      if (
        n.includes("li tudo") ||
        n.includes("ja li tudo") ||
        n.includes("já li tudo") ||
        n.includes("tudo")
      ) {
        blocoAtual.tudoLido = true;
        blocoAtual.capitulos.push("TUDO");
        continue;
      }

      blocoAtual.capitulos.push(...separarCapitulosDaLinha(valorCapitulos));

      const proximas = linhas.slice(index + 1, index + 12);

      for (const proximaLinha of proximas) {
        if (
          linhaEhCampoFeedback(proximaLinha) ||
          linhaEhNovoBloco(proximaLinha)
        ) {
          break;
        }

        const capitulo = limparCapituloInformado(proximaLinha);

        if (capitulo) {
          blocoAtual.capitulos.push(capitulo);
        }
      }
    }

    if (linhaEhCampoFeedback(linha)) {
      blocoAtual.feedbackOferecido = detectarFeedbackNoBloco([linha]);
    }
  }

  if (blocoAtual) {
    blocos.push(blocoAtual);
  }

  return blocos
    .map((bloco) => ({
      obra: limparValor(bloco.obra),
      capitulos: removerDuplicados(bloco.capitulos),
      feedbackOferecido: bloco.feedbackOferecido || detectarFeedbackNoBloco(bloco.linhas),
      tudoLido: bloco.tudoLido
    }))
    .filter((bloco) => bloco.obra);
}

function removerDuplicados(lista = []) {
  const vistos = new Set();

  return lista.filter((item) => {
    const chave = normalizarTexto(item);

    if (!chave || vistos.has(chave)) {
      return false;
    }

    vistos.add(chave);
    return true;
  });
}

function detectarMinhaObra(texto = "") {
  const valor = capturarCampo(texto, [
    "minha obra",
    "é minha obra",
    "eh minha obra",
    "obra própria",
    "obra propria"
  ]);

  const n = normalizar(valor);

  return n.includes("sim") || n === "s";
}

export function interpretarFicha(textoFicha = "") {
  const textoConvertido = converterLetrasEspeciais(textoFicha);

  const blocosObras = extrairBlocosDeObras(textoConvertido);

  const primeiroBloco = blocosObras[0] || null;

  const sub = capturarSub(textoConvertido);
  const nomeLeitor = capturarCampo(textoConvertido, CAMPOS_NOME);
  const userLeitor = capturarUser(textoConvertido);
  const adm = capturarCampo(textoConvertido, CAMPOS_ADM);

  const obraLida =
    primeiroBloco?.obra ||
    capturarCampo(textoConvertido, CAMPOS_OBRA);

  const capitulosInformados = primeiroBloco?.capitulos || [];

  const feedbackOferecido =
    blocosObras.some((bloco) => bloco.feedbackOferecido) ||
    false;

  const minhaObra = detectarMinhaObra(textoConvertido);

  const avisos = [];

  if (!sub) avisos.push("Sub não identificado automaticamente.");
  if (!nomeLeitor) avisos.push("Nome do leitor não identificado automaticamente.");
  if (!userLeitor) avisos.push("User do leitor não identificado automaticamente.");
  if (!obraLida) avisos.push("Obra lida não identificada automaticamente.");
  if (!capitulosInformados.length) avisos.push("Capítulos não identificados automaticamente.");

  if (blocosObras.length > 1) {
    avisos.push(
      "A ficha possui mais de uma obra. Nesta etapa, o sistema preparou automaticamente a primeira obra. As demais serão tratadas no próximo ajuste."
    );
  }

  if (primeiroBloco?.tudoLido) {
    avisos.push(
      "A ficha informa que a obra foi lida inteira. Selecione manualmente os capítulos que deseja conferir."
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
    minhaObra,
    feedbackOferecido,
    blocosObras,
    avisos
  };
}