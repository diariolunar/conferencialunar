export function interpretarImportacaoWattpad(texto = "") {
  const linhas = String(texto || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  let titulo = "";
  let capa = "";
  let link = "";
  let autor = "";
  let userAutor = "";

  const capitulos = [];
  let lendoCapitulos = false;

  linhas.forEach((linha) => {
    const linhaLower = linha.toLowerCase();

    if (linhaLower.startsWith("título:") || linhaLower.startsWith("titulo:")) {
      titulo = limparValor(linha.replace(/^t[íi]tulo\s*:/i, ""));
      return;
    }

    if (linhaLower.startsWith("autor:") || linhaLower.startsWith("autora:")) {
      autor = limparValor(linha.replace(/^autor(a)?\s*:/i, ""));
      return;
    }

    if (
      linhaLower.startsWith("user do autor:") ||
      linhaLower.startsWith("user da autora:") ||
      linhaLower.startsWith("user autor:") ||
      linhaLower.startsWith("user autora:")
    ) {
      userAutor = limparValor(
        linha.replace(/^user\s+(do|da)?\s*autor(a)?\s*:/i, "")
      ).replace(/^@/, "");
      return;
    }

    if (linhaLower.startsWith("capa:")) {
      capa = limparValor(linha.replace(/^capa\s*:/i, ""));
      return;
    }

    if (linhaLower.startsWith("link:")) {
      link = limparValor(linha.replace(/^link\s*:/i, ""));
      return;
    }

    if (linhaLower.startsWith("capítulos") || linhaLower.startsWith("capitulos")) {
      lendoCapitulos = true;
      return;
    }

    if (!lendoCapitulos) {
      return;
    }

    const capitulo = interpretarLinhaCapitulo(linha, capitulos.length + 1);

    if (capitulo) {
      capitulos.push(capitulo);
    }
  });

  return {
    obra: {
      titulo,
      capa,
      link,
      autor,
      userAutor,
      descricao: "",
      wattpadId: extrairIdObra(link)
    },
    capitulos,
    totalCapitulos: capitulos.length
  };
}

function interpretarLinhaCapitulo(linha = "", ordem = 1) {
  const linhaSemOrdem = linha.replace(/^\d+[\).\-–—]\s*/, "").trim();
  const partes = linhaSemOrdem.split("|").map((parte) => parte.trim());

  const tituloBruto = partes[0] || "";
  const linkCapitulo = partes[1] || "";
  const palavras = Number(partes[2] || 0);
  const paragrafos = Number(partes[3] || 0);

  const tituloCapitulo = limparTituloCapitulo(tituloBruto);

  if (!tituloCapitulo) {
    return null;
  }

  return {
    wattpadId: extrairIdDoLink(linkCapitulo),
    titulo: tituloCapitulo,
    link: linkCapitulo,
    palavras,
    paragrafos,
    ordem,
    tipo: detectarTipoCapitulo(tituloCapitulo)
  };
}

function limparValor(valor = "") {
  return String(valor || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function limparTituloCapitulo(titulo = "") {
  let limpo = limparValor(titulo);

  limpo = limpo.replace(/\s+(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo),?\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+\d{1,2},?\s+\d{4}$/i, "");

  limpo = limpo.replace(/\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}$/i, "");

  limpo = limpo.replace(/\s+\d{1,2}\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4}$/i, "");

  limpo = limpo.replace(/\s+\d{1,2}\/\d{1,2}\/\d{2,4}$/i, "");

  limpo = limpo.replace(/\s+\d{4}-\d{2}-\d{2}$/i, "");

  return limparValor(limpo);
}

function detectarTipoCapitulo(titulo = "") {
  const normalizado = titulo.toLowerCase();

  if (normalizado.includes("poesia") || normalizado.includes("poema")) {
    return "Poesia";
  }

  if (normalizado.includes("especial")) {
    return "Especial";
  }

  return "Normal";
}

function extrairIdDoLink(link = "") {
  const match = String(link).match(/wattpad\.com\/(\d+)/i);
  return match?.[1] || "";
}

function extrairIdObra(link = "") {
  const matchStory = String(link).match(/wattpad\.com\/story\/(\d+)/i);

  if (matchStory?.[1]) {
    return matchStory[1];
  }

  const matchNumero = String(link).match(/(\d{5,})/);

  return matchNumero?.[1] || "";
}
